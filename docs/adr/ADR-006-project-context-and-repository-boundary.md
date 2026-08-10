/**
 * ADR-006: Project Context and Repository Boundary
 *
 * Context
 * - The application maintains data isolation across projects
 * - Role-based access control is enforced at the repository level
 * - No actual authentication or persistence implemented
 *
 * Decision
 * - Implement project-scoped entities and repository contracts
 * - Enforce access rules via repository methods
 * - Use in-memory repository for development
 *
 * Rationale
 * - Prevents data leakage between projects
 * - Simplifies access control by handling it in repository
 * - Decouples domain logic from implementation details
 *
 * Consequences
 * - Development complexity for distributed deployment
 * - Requires careful context management
 *- Security limitations: No user verification
 *
 * Security Limitations
 * - No actual authentication
 * - No audit logging
 *- No role enforcement outside repository
 *
 * Non-Goals
 * - Not implementing real authentication
 *- Not building distributed persistence
 *- Not adding middleware layers
 *
 * Future Migration Path
 * - Add OAuth2 authentication
 *- Move to distributed database
 *- Implement audit logging
 */
