import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  GovernedSuperAdobeRuntime,
  type GovernedSuperAdobeInput,
} from '@jaryan/shared-application';
import {
  RuntimeSecurityError,
  RuntimeSecurityService,
} from '@jaryan/shared-application/runtime-security.js';

@Controller('projects/:projectId')
export class CalculationController {
  constructor(
    private readonly security: RuntimeSecurityService,
    private readonly runtime: GovernedSuperAdobeRuntime,
  ) {}

  @Post('calculations/superadobe')
  async execute(
    @Param('projectId') projectId: string,
    @Headers('cookie') cookieHeader: string | undefined,
    @Body() body: GovernedSuperAdobeInput,
  ) {
    try {
      const context = await this.security.authorize(
        readSessionCookie(cookieHeader),
        projectId,
      );
      const result = await this.runtime.execute(context, body);
      if (result.status === 'INVALID_INPUT') {
        throw new BadRequestException({
          code: result.status,
          errors: result.errors,
        });
      }
      if (result.status === 'PARTIAL') {
        throw new InternalServerErrorException({
          code: result.status,
          executionId: result.executionId,
          snapshotBindings: result.snapshotBindings,
          diagnostic: result.diagnostic,
        });
      }
      return result;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Get('calculations/:calculationId/evidence/:snapshotId')
  async evidence(
    @Param('projectId') projectId: string,
    @Param('calculationId') calculationId: string,
    @Param('snapshotId') snapshotId: string,
    @Headers('cookie') cookieHeader: string | undefined,
  ) {
    try {
      const context = await this.security.authorize(
        readSessionCookie(cookieHeader),
        projectId,
      );
      const result = await this.runtime.readHistoricalEvidenceByCalculationId(
        context,
        calculationId,
        snapshotId,
      );
      if (result.status === 'NOT_FOUND') {
        throw new NotFoundException({ code: result.status });
      }
      if (result.status === 'INVALID') {
        throw new UnprocessableEntityException({
          code: result.status,
          diagnostic: result.diagnostic,
        });
      }
      if (result.status === 'AMBIGUOUS') {
        throw new ConflictException({ code: result.status });
      }
      if (result.status === 'UNKNOWN') {
        throw new InternalServerErrorException({
          code: result.status,
          diagnostic: result.diagnostic,
        });
      }
      return result;
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

function readSessionCookie(cookieHeader: string | undefined): string | null {
  if (cookieHeader === undefined) return null;
  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('jaryan_session='));
  return value === undefined
    ? null
    : decodeURIComponent(value.slice('jaryan_session='.length));
}

function toHttpError(error: unknown): Error {
  if (error instanceof HttpException) return error;
  if (!(error instanceof RuntimeSecurityError)) {
    return error instanceof Error ? error : new Error(String(error));
  }
  if (error.code === 'UNAUTHENTICATED' || error.code === 'INVALID_SESSION') {
    return new UnauthorizedException({
      code: error.code,
      message: error.message,
    });
  }
  if (error.code === 'PROJECT_NOT_FOUND') {
    return new NotFoundException({
      code: error.code,
      message: error.message,
    });
  }
  return new ForbiddenException({
    code: error.code,
    message: error.message,
  });
}
