import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheckDto } from './health.dto';
import { HealthService } from './health.service';
import type { HealthCheck } from './health.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Liveness/readiness probe including database connectivity.',
    schema: HealthCheckDto.openApiSchema,
  })
  check(): Promise<HealthCheck> {
    return this.health.check();
  }
}
