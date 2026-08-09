import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Structure, Prisma } from '@prisma/client';

@Injectable()
export class StructureRepository {
  constructor(private prisma: PrismaService) {}

  async createForProject(projectId: string, data: Omit<Prisma.StructureCreateInput, 'project'>): Promise<Structure> {
    return this.prisma.structure.create({
      data: { ...data, projectId },
    });
  }

  async findByProject(projectId: string): Promise<Structure[]> {
    return this.prisma.structure.findMany({ where: { projectId } });
  }
}