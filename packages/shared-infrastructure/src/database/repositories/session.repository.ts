import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type {
  SessionResolver,
  SessionRecord,
} from '../../../../shared-application/src/runtime-security.ts';

@Injectable()
export class SessionRepository implements SessionResolver {
  constructor(private readonly prisma: PrismaService) {}

  async findById(sessionId: string): Promise<SessionRecord | null> {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, expiresAt: true },
    });
  }
}
