import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import {
  RuntimeSecurityError,
  RuntimeSecurityService,
} from '@jaryan/shared-application/runtime-security.js';

@Controller()
export class SecurityController {
  constructor(private readonly security: RuntimeSecurityService) {}

  @Get('health')
  health(): { readonly status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('projects/:projectId/access')
  async authorizeProject(
    @Param('projectId') projectId: string,
    @Headers('cookie') cookieHeader?: string,
  ) {
    try {
      const context = await this.security.authorize(
        readSessionCookie(cookieHeader),
        projectId,
      );
      return {
        projectId: context.projectId,
        userId: context.principal.userId,
        membershipRole: context.membershipRole,
      };
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
