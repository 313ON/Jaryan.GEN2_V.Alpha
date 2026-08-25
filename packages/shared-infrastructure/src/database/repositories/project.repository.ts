import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Project, Prisma } from '@prisma/client';
import type {
  ProjectResolver,
  ProjectRecord,
} from '../../../../shared-application/src/runtime-security.ts';

@Injectable()
export class ProjectRepository implements ProjectResolver {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<(Project & ProjectRecord) | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: { members: true }
    });
  }

  async findProjectById(id: string): Promise<Project | null> {
    return this.findById(id);
  }

  async listUserProjects(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: {
        members: { some: { userId } }
      }
    });
  }

  async createProject(ownerId: string, data: Prisma.ProjectCreateInput): Promise<Project> {
    return this.prisma.project.create({
      data: {
        ...data,
        members: {
          create: {
            userId: ownerId,
            role: 'OWNER'
          }
        }
      }
    });
  }
}
