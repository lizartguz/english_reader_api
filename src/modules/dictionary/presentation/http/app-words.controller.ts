import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { RoleCode } from '@/common/enums/role-code.enum';
import { DictionaryMessages } from '@/common/constants/messages.constants';
import { WordLookupQueryDto } from '../../application/dto';
import { LookupWordUseCase } from '../../application/use-cases';
import { WordLookupResponseDto } from '../../domain/word-entry.mapper';

/** Endpoints de palabras consumidos por la aplicación Flutter. */
@ApiTags('App · Palabras')
@ApiBearerAuth()
@RequireRoles(RoleCode.Client)
@Controller({ path: 'app/words', version: '1' })
export class AppWordsController {
  constructor(private readonly lookupWordUseCase: LookupWordUseCase) {}

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
}
