import { Injectable } from '@nestjs/common';
import { FoodCategory, type Prisma } from '@prisma/client';
import type { PlatformSettings, UpdateSettingsInput } from '@rescuebite/types';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';

const SINGLETON_ID = 'singleton';

/**
 * Operator-tunable platform settings, persisted as a single row. The commission
 * rate read here is the live source of truth used at checkout (it falls back to
 * the env default when the row is first created).
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async getSettings(): Promise<PlatformSettings> {
    const row = await this.prisma.platformSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: {
        id: SINGLETON_ID,
        commissionBps: this.config.platformFeeBps,
        enabledCategories: Object.values(FoodCategory),
        featureFlags: {},
      },
    });
    return toSettings(row);
  }

  /** The live platform commission in basis points, used by checkout. */
  async getCommissionBps(): Promise<number> {
    return (await this.getSettings()).commissionBps;
  }

  async updateSettings(input: UpdateSettingsInput): Promise<PlatformSettings> {
    await this.getSettings(); // ensure the row exists
    const data: Prisma.PlatformSettingsUpdateInput = {};
    if (input.commissionBps !== undefined) data.commissionBps = input.commissionBps;
    if (input.enabledCategories !== undefined) data.enabledCategories = input.enabledCategories;
    if (input.featureFlags !== undefined) data.featureFlags = input.featureFlags;
    const row = await this.prisma.platformSettings.update({ where: { id: SINGLETON_ID }, data });
    return toSettings(row);
  }
}

function toSettings(row: {
  commissionBps: number;
  enabledCategories: FoodCategory[];
  featureFlags: Prisma.JsonValue;
  updatedAt: Date;
}): PlatformSettings {
  return {
    commissionBps: row.commissionBps,
    enabledCategories: row.enabledCategories,
    featureFlags: toFlags(row.featureFlags),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Coerce the stored JSON into a string→boolean map, dropping non-boolean values. */
function toFlags(value: Prisma.JsonValue): Record<string, boolean> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const flags: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'boolean') flags[key] = val;
  }
  return flags;
}
