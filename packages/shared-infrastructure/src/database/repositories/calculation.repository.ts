import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { Calculation, Prisma } from '@prisma/client';

@Injectable()
export class CalculationRepository {
  constructor(private prisma: PrismaService) {}

  async saveCalculation(projectId: string, data: Omit<Prisma.CalculationCreateInput, 'project'>): Promise<Calculation> {
    return this.prisma.calculation.create({
      data: {...data, projectId },
    });
  }

  async getProjectHistory(projectId: string): Promise<Calculation[]> {
    return this.prisma.calculation.findMany({
      where: { projectId },
      orderBy: { calculatedAt: 'desc' },
    });
  }
}
