import { z } from 'zod';
import { createZodDto } from '../common/validation/zod-dto';

export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'error']),
  /** Process uptime in seconds. */
  uptime: z.number(),
  timestamp: z.string().datetime(),
  checks: z.object({
    database: z.enum(['up', 'down']),
  }),
});
export type HealthCheck = z.infer<typeof HealthCheckSchema>;

export class HealthCheckDto extends createZodDto(HealthCheckSchema) {}
