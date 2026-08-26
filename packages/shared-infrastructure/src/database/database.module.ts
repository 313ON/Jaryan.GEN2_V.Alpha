import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { UserRepository } from './repositories/user.repository.js';
import { ProjectRepository } from './repositories/project.repository.js';
import { ProjectMemberRepository } from './repositories/project-member.repository.js';
import { StructureRepository } from './repositories/structure.repository.js';
import { CalculationRepository } from './repositories/calculation.repository.js';
import { DurableCalculationSnapshotRepository } from './repositories/durable-calculation-snapshot.repository.js';
import { SessionRepository } from './repositories/session.repository.js';

@Global()
@Module({
  providers: [PrismaService, UserRepository, ProjectRepository, ProjectMemberRepository, SessionRepository, StructureRepository, CalculationRepository, DurableCalculationSnapshotRepository],
  exports: [PrismaService, UserRepository, ProjectRepository, ProjectMemberRepository, SessionRepository, StructureRepository, CalculationRepository, DurableCalculationSnapshotRepository],
})
export class DatabaseModule {}
