import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '@/common/decorators/public.decorator';
import { ApiResult } from '@/common/dto/api-result';

/** Estado de la API, usado por monitoreo y por los despliegues en contenedor. */
@ApiTags('Estado')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Comprobar que la API responde' })
  check(): ApiResult<{ status: string; environment: string; timestamp: string }> {
    return ApiResult.of(
      {
        status: 'ok',
        environment: this.configService.get<string>('app.env') as string,
        timestamp: new Date().toISOString(),
      },
      'La API está disponible.',
    );
  }
}
