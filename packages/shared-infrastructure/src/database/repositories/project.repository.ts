import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { Project, Prisma } from '@prisma/client';

@Injectable()
export class ProjectRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Project | null> {
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
