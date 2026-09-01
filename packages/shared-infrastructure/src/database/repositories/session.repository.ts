import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(sessionId: string): Promise<{
    readonly id: string;
    readonly userId: string;
    readonly expiresAt: Date;
  } | null> {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, expiresAt: true },
    });
  }
}
