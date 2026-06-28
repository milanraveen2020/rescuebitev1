import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuditLogEntry, AuditLogQuery } from '@rescuebite/types';
import { PrismaService } from '../common/prisma/prisma.service';
import { toOffsetFindArgs, toOffsetPage, type OffsetPage } from '../common/pagination/pagination';

interface RecordInput {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

const SORT_FIELDS = ['createdAt'] as const;

/** Writes and reads the immutable AuditLog. Every admin mutation records here. */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  }

  async list(query: AuditLogQuery): Promise<OffsetPage<AuditLogEntry>> {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = query.action;
    if (query.actorId) where.actorId = query.actorId;

    const args = toOffsetFindArgs(query, SORT_FIELDS, 'createdAt');
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        ...args,
        include: { actor: { select: { email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items: AuditLogEntry[] = rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      actorEmail: row.actor?.email ?? null,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      metadata: toMetadata(row.metadata),
      createdAt: row.createdAt.toISOString(),
    }));
    return toOffsetPage(items, total, query);
  }
}

function toMetadata(value: Prisma.JsonValue): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}
