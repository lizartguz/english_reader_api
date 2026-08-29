import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { IdParamDto } from '@/common/dto/id-param.dto';
import { RoleCode } from '@/common/enums/role-code.enum';
import { DictionaryMessages } from '@/common/constants/messages.constants';
import { WordLookupQueryDto } from '../../application/dto';
import { GetPronunciationAudioUseCase, LookupWordUseCase } from '../../application/use-cases';
import { WordLookupResponseDto } from '../../domain/word-entry.mapper';

/** Endpoints de palabras consumidos por la aplicación Flutter. */
@ApiTags('App · Palabras')
@ApiBearerAuth()
@RequireRoles(RoleCode.Client)
@Controller({ path: 'app/words', version: '1' })
export class AppWordsController {
  constructor(
    private readonly lookupWordUseCase: LookupWordUseCase,
    private readonly getPronunciationAudioUseCase: GetPronunciationAudioUseCase,
  ) {}

  @Get('lookup')
  @ApiOperation({ summary: 'Consultar una palabra desde Flutter' })
  @ApiResponse({ status: 200, type: WordLookupResponseDto })
  async lookup(
    @Query() query: WordLookupQueryDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResult<WordLookupResponseDto>> {
    const word = await this.lookupWordUseCase.execute(query, userId);

    return ApiResult.of(word, DictionaryMessages.WordRetrieved);
  }

  /**
   * Entrega el audio de una pronunciación desde este servidor.
   *
   * La app no descarga el audio del proveedor externo: si lo hiciera, el
   * dispositivo del lector contactaría a un tercero que conoceria su IP y qué
   * palabra está consultando. Aquí ese tráfico queda del lado del servidor.
   */
  @Get('pronunciations/:id/audio')
  @Header('Cache-Control', 'private, max-age=86400')
  @ApiOperation({ summary: 'Descargar el audio de una pronunciación' })
  async pronunciationAudio(@Param() params: IdParamDto, @Res() response: Response): Promise<void> {
    const audio = await this.getPronunciationAudioUseCase.execute(params.id);

    response.contentType(audio.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Length', audio.buffer.length);
    response.send(audio.buffer);
  }
}
