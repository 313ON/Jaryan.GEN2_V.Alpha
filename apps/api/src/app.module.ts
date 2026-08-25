import { Module } from '@nestjs/common';
import { RuntimeSecurityService } from '../../../packages/shared-application/src/runtime-security.ts';
import { DatabaseModule } from '../../../packages/shared-infrastructure/src/database/database.module.ts';
import { ProjectMemberRepository } from '../../../packages/shared-infrastructure/src/database/repositories/project-member.repository.ts';
import { ProjectRepository } from '../../../packages/shared-infrastructure/src/database/repositories/project.repository.ts';
import { SessionRepository } from '../../../packages/shared-infrastructure/src/database/repositories/session.repository.ts';
import { UserRepository } from '../../../packages/shared-infrastructure/src/database/repositories/user.repository.ts';
import { SecurityController } from './security.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SecurityController],
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
  ],
})
export class AppModule {}
