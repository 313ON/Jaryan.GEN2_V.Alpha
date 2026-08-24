import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UserRepository } from './repositories/user.repository';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { StructureRepository } from './repositories/structure.repository';
import { CalculationRepository } from './repositories/calculation.repository';
import { DurableCalculationSnapshotRepository } from './repositories/durable-calculation-snapshot.repository';

@Global()
@Module({
  providers: [PrismaService, UserRepository, ProjectRepository, ProjectMemberRepository, StructureRepository, CalculationRepository, DurableCalculationSnapshotRepository],
  exports: [PrismaService, UserRepository, ProjectRepository, ProjectMemberRepository, StructureRepository, CalculationRepository, DurableCalculationSnapshotRepository],
})
export class DatabaseModule {}
