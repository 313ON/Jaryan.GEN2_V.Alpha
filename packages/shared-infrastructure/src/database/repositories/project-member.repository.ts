import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProjectMember, Prisma } from '@prisma/client';
import type {
  ProjectMembershipResolver,
  ProjectMembershipRecord,
} from '../../../../shared-application/src/runtime-security.ts';

@Injectable()
export class ProjectMemberRepository implements ProjectMembershipResolver {
  constructor(private prisma: PrismaService) {}

  async addMember(data: Prisma.ProjectMemberCreateInput): Promise<ProjectMember> {
    return this.prisma.projectMember.create({ data });
  }

  async findByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<(ProjectMember & ProjectMembershipRecord) | null> {
    return this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  }
}
