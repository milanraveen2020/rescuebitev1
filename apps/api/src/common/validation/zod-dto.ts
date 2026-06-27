import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

// Narrow the library's deeply-generic signature to a simple one. Going through
// `unknown` avoids an assignability check against its giant recursive type,
// which otherwise makes the compiler recurse (TS2589) or run out of memory.
const toOpenApiSchema = zodToJsonSchema as unknown as (
  schema: z.ZodTypeAny,
  options: { target: 'openApi3'; $refStrategy: 'none' },
) => SchemaObject;

/**
 * A DTO class carrying its Zod schema. Create these from schemas in
 * `@rescuebite/types` and use them as controller param types — the global
 * ZodValidationPipe finds the schema and validates the payload, and Swagger
 * reads `openApiSchema` to document the shape.
 *
 * @example
 *   class CreateOrderDto extends createZodDto(CreateOrderSchema) {}
 *   @Post() create(@Body() dto: CreateOrderDto) { ... }
 */
export interface ZodDtoStatic<TOut = unknown> {
  new (): TOut;
  zodSchema: z.ZodType<TOut>;
  openApiSchema: SchemaObject;
}

// Derive the DTO instance type from the schema's OUTPUT (so defaults are present
// and required), not its input — keeps controller param types aligned with what
// the pipe actually produces.
export function createZodDto<S extends z.ZodTypeAny>(schema: S): ZodDtoStatic<z.output<S>> {
  class AugmentedZodDto {
    static zodSchema = schema;
    // `$refStrategy: 'none'` inlines every sub-schema so the resulting OpenAPI
    // schema is self-contained (no dangling $ref to a definitions section).
    static openApiSchema = toOpenApiSchema(schema, {
      target: 'openApi3',
      $refStrategy: 'none',
    });
  }
  // The class is a phantom carrier for Nest's metatype reflection; its instance
  // type can't structurally match TOut, so the cast is required at runtime.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return AugmentedZodDto as ZodDtoStatic<z.output<S>>;
}

export function isZodDto(metatype: unknown): metatype is ZodDtoStatic {
  return (
    typeof metatype === 'function' &&
    'zodSchema' in metatype &&
    typeof (metatype as { zodSchema?: unknown }).zodSchema === 'object'
  );
}
