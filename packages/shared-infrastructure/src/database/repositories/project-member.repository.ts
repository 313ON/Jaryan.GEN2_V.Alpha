import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { ProjectMember, Prisma } from '@prisma/client';

@Injectable()
export class ProjectMemberRepository {
  constructor(private prisma: PrismaService) {}

  async addMember(data: Prisma.ProjectMemberCreateInput): Promise<ProjectMember> {
    return this.prisma.projectMember.create({ data });
  }

  async findByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember | null> {
    return this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  }
}
