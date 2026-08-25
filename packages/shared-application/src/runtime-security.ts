export type MembershipRole = 'OWNER' | 'EDITOR' | 'VIEW_ONLY';

export interface AuthenticatedPrincipal {
  readonly userId: string;
}

export interface AuthorizedProjectContext {
  readonly projectId: string;
  readonly principal: AuthenticatedPrincipal;
  readonly membershipRole: MembershipRole;
}

export type RuntimeSecurityFailureCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_SESSION'
  | 'PROJECT_NOT_FOUND'
  | 'PROJECT_ACCESS_DENIED'
  | 'UNAUTHORIZED';

export class RuntimeSecurityError extends Error {
  readonly code: RuntimeSecurityFailureCode;

  constructor(code: RuntimeSecurityFailureCode, message: string) {
    super(message);
    this.name = 'RuntimeSecurityError';
    this.code = code;
  }
}

export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly expiresAt: Date;
}

export interface UserRecord {
  readonly id: string;
}

export interface ProjectRecord {
  readonly id: string;
}

export interface ProjectMembershipRecord {
  readonly projectId: string;
  readonly userId: string;
  readonly role: string;
}

export interface SessionResolver {
  findById(sessionId: string): Promise<SessionRecord | null>;
}

export interface UserResolver {
  findById(userId: string): Promise<UserRecord | null>;
}

export interface ProjectResolver {
  findById(projectId: string): Promise<ProjectRecord | null>;
}

export interface ProjectMembershipResolver {
  findByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectMembershipRecord | null>;
}

export interface RuntimeSecurityPorts {
  readonly sessions: SessionResolver;
  readonly users: UserResolver;
  readonly projects: ProjectResolver;
  readonly memberships: ProjectMembershipResolver;
}

export class RuntimeSecurityService {
  private readonly ports: RuntimeSecurityPorts;

  constructor(ports: RuntimeSecurityPorts) {
    this.ports = ports;
  }

  async authenticate(
    sessionId: string | null | undefined,
  ): Promise<AuthenticatedPrincipal> {
    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      throw new RuntimeSecurityError(
        'UNAUTHENTICATED',
        'An authenticated session is required.',
      );
    }

    const session = await this.ports.sessions.findById(sessionId);
    if (session === null || session.expiresAt.getTime() <= Date.now()) {
      throw new RuntimeSecurityError(
        'INVALID_SESSION',
        'The session is missing, expired, or invalid.',
      );
    }

    const user = await this.ports.users.findById(session.userId);
    if (user === null) {
      throw new RuntimeSecurityError(
        'INVALID_SESSION',
        'The session user does not exist.',
      );
    }

    return Object.freeze({ userId: user.id });
  }

  async authorizeProject(
    principal: AuthenticatedPrincipal,
    projectId: string,
  ): Promise<AuthorizedProjectContext> {
    const project = await this.ports.projects.findById(projectId);
    if (project === null) {
      throw new RuntimeSecurityError(
        'PROJECT_NOT_FOUND',
        'The requested project does not exist.',
      );
    }

    const membership = await this.ports.memberships.findByProjectAndUser(
      project.id,
      principal.userId,
    );
    if (membership === null) {
      throw new RuntimeSecurityError(
        'PROJECT_ACCESS_DENIED',
        'The authenticated user is not a member of the requested project.',
      );
    }

    if (!isMembershipRole(membership.role)) {
      throw new RuntimeSecurityError(
        'UNAUTHORIZED',
        'The project membership role is not authorized.',
      );
    }

    return Object.freeze({
      projectId: project.id,
      principal: Object.freeze({ userId: principal.userId }),
      membershipRole: membership.role,
    });
  }

  async authorize(
    sessionId: string | null | undefined,
    projectId: string,
  ): Promise<AuthorizedProjectContext> {
    return this.authorizeProject(
      await this.authenticate(sessionId),
      projectId,
    );
  }
}

function isMembershipRole(value: string): value is MembershipRole {
  return value === 'OWNER' || value === 'EDITOR' || value === 'VIEW_ONLY';
}
