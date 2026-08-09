import { PublicConfigSchema } from '@rescuebite/types';
import { createZodDto } from '../validation/zod-dto';

/** Response DTO for `GET /config` — see `PublicConfigSchema`. */
export class PublicConfigDto extends createZodDto(PublicConfigSchema) {}
