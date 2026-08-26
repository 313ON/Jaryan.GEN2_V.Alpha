import { Module } from '@nestjs/common';
import { RuntimeSecurityService } from '@jaryan/shared-application/runtime-security.js';
import { DatabaseModule } from '@jaryan/shared-infrastructure/database/database.module.js';
import { ProjectMemberRepository } from '@jaryan/shared-infrastructure/database/repositories/project-member.repository.js';
import { ProjectRepository } from '@jaryan/shared-infrastructure/database/repositories/project.repository.js';
import { SessionRepository } from '@jaryan/shared-infrastructure/database/repositories/session.repository.js';
import { UserRepository } from '@jaryan/shared-infrastructure/database/repositories/user.repository.js';
import { SecurityController } from './security.controller.ts';
import { CalculationController } from './calculation.controller.ts';
import { DurableCalculationSnapshotRepository } from '@jaryan/shared-infrastructure/database/repositories/durable-calculation-snapshot.repository.js';
import { GovernedSuperAdobeRuntime } from '@jaryan/shared-application';

@Module({
  imports: [DatabaseModule],
  controllers: [SecurityController, CalculationController],
  providers: [
    {
      provide: RuntimeSecurityService,
      useFactory: (
        sessions: SessionRepository,
        users: UserRepository,
        projects: ProjectRepository,
        memberships: ProjectMemberRepository,
      ) => new RuntimeSecurityService({ sessions, users, projects, memberships }),
      inject: [
        SessionRepository,
        UserRepository,
        ProjectRepository,
        ProjectMemberRepository,
      ],
    },
    {
      provide: GovernedSuperAdobeRuntime,
      useFactory: (
        snapshots: DurableCalculationSnapshotRepository,
      ) => new GovernedSuperAdobeRuntime(snapshots),
      inject: [DurableCalculationSnapshotRepository],
    },
  ],
})
export class AppModule {}
