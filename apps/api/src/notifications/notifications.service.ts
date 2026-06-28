import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  type DevicePlatform,
  type Notification as DbNotification,
  type NotificationType,
} from '@prisma/client';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type CursorPaginationQuery,
  type Notification,
  type NotificationData,
  type NotificationPage,
  type NotificationPreferences,
  type UpdateNotificationPreferencesInput,
} from '@rescuebite/types';
import { PrismaService } from '../common/prisma/prisma.service';
import { toCursorFindArgs, toCursorPage } from '../common/pagination/pagination';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
  /** Deterministic key making (re)delivery of the same event idempotent. */
  dedupeKey?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist an inbox notification. Idempotent: a duplicate `dedupeKey` is a no-op
   * (returns null), so the same domain event re-delivered won't create dupes.
   */
  async create(input: CreateNotificationInput): Promise<Notification | null> {
    try {
      const row = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          data: input.data === undefined ? Prisma.JsonNull : (input.data as Prisma.InputJsonValue),
          dedupeKey: input.dedupeKey,
        },
      });
      return toNotification(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null; // already delivered for this dedupeKey
      }
      throw error;
    }
  }

  async list(userId: string, query: CursorPaginationQuery): Promise<NotificationPage> {
    const args = toCursorFindArgs(query);
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      ...args,
    });
    const page = toCursorPage(rows, query, (row) => row.id);
    return {
      items: page.items.map(toNotification),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId)
      throw new NotFoundException('Notification not found.');
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });
    return toNotification(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // --- Device tokens (push) ------------------------------------------------

  async registerDevice(userId: string, token: string, platform: DevicePlatform): Promise<void> {
    // One physical device = one token; re-registering reassigns it to this user.
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
  }

  // --- Preferences ---------------------------------------------------------

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    return mergePreferences(user?.notificationPrefs);
  }

  async updatePreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    const next: NotificationPreferences = { ...current, ...input };
    await this.prisma.user.update({ where: { id: userId }, data: { notificationPrefs: next } });
    return next;
  }
}

/** Merge stored JSON preferences over the platform defaults (unknown shape → defaults). */
export function mergePreferences(
  stored: Prisma.JsonValue | null | undefined,
): NotificationPreferences {
  if (
    stored === null ||
    stored === undefined ||
    typeof stored !== 'object' ||
    Array.isArray(stored)
  ) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
  const result = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  for (const key of Object.keys(result) as (keyof NotificationPreferences)[]) {
    const value = (stored as Record<string, unknown>)[key];
    if (typeof value === 'boolean') result[key] = value;
  }
  return result;
}

function toNotification(row: DbNotification): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    data: toData(row.data),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toData(value: Prisma.JsonValue): NotificationData | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}
