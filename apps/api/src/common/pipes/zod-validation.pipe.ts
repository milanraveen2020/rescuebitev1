import { type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Validates an incoming payload against a Zod schema at the controller boundary.
 * Throws ZodError on failure, which HttpExceptionFilter turns into a 400
 * validation_error. Use on every controller input so no unvalidated data flows in.
 *
 * @example
 *   @Body(new ZodValidationPipe(CreateReservationSchema)) body: CreateReservation
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}
