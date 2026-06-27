import { Injectable, type ArgumentMetadata, type PipeTransform } from '@nestjs/common';
import { isZodDto } from './zod-dto';

/**
 * Global validation pipe. When a controller param is typed as a DTO created by
 * `createZodDto`, the payload is parsed against that Zod schema; any other param
 * passes through untouched. A failed parse throws ZodError, which the global
 * HttpExceptionFilter turns into a 400 `validation_error` response.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const { metatype } = metadata;
    if (!metatype || !isZodDto(metatype)) {
      return value;
    }
    return metatype.zodSchema.parse(value);
  }
}
