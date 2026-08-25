import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User, Prisma } from '@prisma/client';
import type {
  UserResolver,
  UserRecord,
} from '../../../../shared-application/src/runtime-security.ts';

@Injectable()
export class UserRepository implements UserResolver {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<(User & UserRecord) | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
