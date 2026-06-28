import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../common/prisma/prisma.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Expo returns one ticket per message; a "DeviceNotRegistered" error means the
// token is dead and should be pruned.
const ExpoTicketSchema = z.object({
  status: z.enum(['ok', 'error']),
  details: z.object({ error: z.string().optional() }).optional(),
});
const ExpoResponseSchema = z.object({ data: z.array(ExpoTicketSchema) });

/**
 * Sends Expo push notifications to all of a user's registered devices. Failures
 * are logged, never thrown — push is best-effort and must not break a request.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async sendToUser(userId: string, message: PushMessage): Promise<void> {
    const devices = await this.prisma.deviceToken.findMany({ where: { userId } });
    if (devices.length === 0) return;

    const tokens = devices.map((d) => d.token);
    const messages = tokens.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: 'default',
    }));

    if (!this.config.expoAccessToken && this.config.nodeEnv !== 'production') {
      this.logger.warn(`[push:dev] ${tokens.length} device(s): ${message.title} — ${message.body}`);
    }

    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (this.config.expoAccessToken) {
        headers.authorization = `Bearer ${this.config.expoAccessToken}`;
      }
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
      });
      if (!response.ok) {
        this.logger.error(`Expo push failed (${response.status}): ${await response.text()}`);
        return;
      }
      const parsed = ExpoResponseSchema.safeParse(await response.json());
      if (!parsed.success) return;
      await this.pruneDeadTokens(tokens, parsed.data.data);
    } catch (error) {
      this.logger.error(
        'Expo push request error',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async pruneDeadTokens(
    tokens: string[],
    tickets: z.infer<typeof ExpoResponseSchema>['data'],
  ): Promise<void> {
    const dead = tokens.filter(
      (_, i) =>
        tickets[i]?.status === 'error' && tickets[i]?.details?.error === 'DeviceNotRegistered',
    );
    if (dead.length > 0) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
    }
  }
}
