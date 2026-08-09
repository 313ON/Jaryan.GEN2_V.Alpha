import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UserRepository } from './repositories/user.repository';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { StructureRepository } from './repositories/structure.repository';
import { CalculationRepository } from './repositories/calculation.repository';

@Global()
@Module({
  providers: [PrismaService, UserRepository, ProjectRepository, ProjectMemberRepository, StructureRepository, CalculationRepository],
  exports: [PrismaService, UserRepository, ProjectRepository, ProjectMemberRepository, StructureRepository, CalculationRepository],
})
export class DatabaseModule {}