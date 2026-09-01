import { createHash } from 'node:crypto';

export const CANONICALIZER_VERSION = '1.0.0';
export const NORMALIZATION_POLICY_VERSION = '1.0.0';

export type SchemaFailureClass =
  | 'MISSING_OBJECT'
  | 'UNEXPECTED_OBJECT'
  | 'SEMANTIC_ATTRIBUTE_MISMATCH'
  | 'NORMALIZATION_MISMATCH'
  | 'UNSUPPORTED_CATALOG_FORM'
  | 'UNKNOWN';

export interface SchemaDifference {
  readonly object: string;
  readonly field: string;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly classification: SchemaFailureClass;
}

export interface ManifestScope {
  readonly [key: string]: unknown;
}

export interface CatalogIndexKeyPart {
  readonly kind: 'column' | 'expression';
  readonly name?: string;
  readonly expression?: string;
}

export interface CatalogIndex {
  readonly name: string;
  readonly table: string;
  readonly unique: boolean;
  readonly keyParts?: readonly CatalogIndexKeyPart[];
  readonly includeColumns?: readonly string[];
  /** Legacy manifest form; adapted to keyParts at the canonicalization boundary. */
  readonly columns?: readonly string[];
  readonly predicate?: string | null;
  readonly expressions?: readonly string[];
  readonly constraintBacked?: boolean;
}

export interface CatalogUniqueConstraint {
  readonly name: string;
  readonly table: string;
  readonly columns: readonly string[];
}

export interface CatalogScope extends ManifestScope {
  readonly indexes?: readonly CatalogIndex[];
  readonly uniqueConstraints?: readonly CatalogUniqueConstraint[];
}

export interface SchemaVerificationProvenance {
  readonly manifestIdentity: string;
  readonly baselineArtifact: string;
  readonly baselineArtifactHash: string;
  readonly canonicalizerVersion: string;
  readonly normalizationPolicyVersion: string;
  readonly verifiedAt: string;
}

export interface SchemaVerificationResult {
  readonly match: boolean;
  readonly representation: string;
  readonly fingerprint: string;
  readonly differences: readonly SchemaDifference[];
  readonly provenance: SchemaVerificationProvenance;
}

interface CanonicalizationContext {
  readonly defaultSchema?: string;
  readonly tableSchema?: string;
  readonly tableName?: string;
}

function collectionField(path: readonly string[]): string | undefined {
  return path.at(-1);
}

function compareIdentity(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function schemaIdentity(
  value: Record<string, unknown>,
  context: CanonicalizationContext,
): string {
  const schema = value.schema;
  if (typeof schema === 'string' && schema.length > 0) return schema;
  if (context.defaultSchema) return context.defaultSchema;
  throw new Error('INCOMPLETE_IDENTITY: schema is required for canonical collection identity.');
}

function requiredIdentityString(
  value: Record<string, unknown>,
  field: string,
  collection: string,
): string {
  const identity = value[field];
  if (typeof identity !== 'string' || identity.length === 0) {
    throw new Error(`INCOMPLETE_IDENTITY: ${collection}.${field} is required.`);
  }
  return identity;
}

function collectionIdentity(
  path: readonly string[],
  value: Record<string, unknown>,
  context: CanonicalizationContext,
): string {
  const field = collectionField(path);
  const schema = typeof value.schema === 'string' && value.schema.length > 0
    ? value.schema
    : context.tableSchema ?? schemaIdentity(value, context);
  const name = requiredIdentityString(value, 'name', field ?? 'collection');
  switch (field) {
    case 'tables':
      return `table\0${schema}\0${name}\0${String(value.relkind ?? 'r')}`;
    case 'primaryKeys':
      return `constraint\0${schema}\0${
        typeof value.table === 'string' && value.table.length > 0
          ? value.table
          : context.tableName ?? requiredIdentityString(value, 'table', 'primaryKeys')
      }\0p\0${name}`;
    case 'uniqueConstraints':
      return `constraint\0${schema}\0${requiredIdentityString(value, 'table', 'uniqueConstraints')}\0u\0${name}`;
    case 'foreignKeys':
      return `constraint\0${schema}\0${requiredIdentityString(value, 'table', 'foreignKeys')}\0f\0${name}`;
    case 'indexes':
      return `index\0${schema}\0${requiredIdentityString(value, 'table', 'indexes')}\0${name}`;
    case 'functions': {
      const signature = value.signature;
      return `function\0${schema}\0${name}\0${typeof signature === 'string' ? signature : '<current-scope-signature>'}`;
    }
    case 'triggers':
      return `trigger\0${schema}\0${requiredIdentityString(value, 'table', 'triggers')}\0${name}`;
    default:
      throw new Error(`UNSUPPORTED_COLLECTION: ${field ?? '<root>'} is not an object collection.`);
  }
}

function assertUniqueIdentities(
  path: readonly string[],
  values: readonly unknown[],
  context: CanonicalizationContext,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`INCOMPLETE_IDENTITY: ${collectionField(path) ?? 'collection'} contains a non-object item.`);
    }
    const identity = collectionIdentity(path, value as Record<string, unknown>, context);
    if (seen.has(identity)) {
      throw new Error(`DUPLICATE_IDENTITY: ${identity.replaceAll('\0', '.')}`);
    }
    seen.add(identity);
  }
}

function canonicalIndexShape(value: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(value.keyParts)) return value;
  const keyParts = value.keyParts as Array<Record<string, unknown>>;
  const includeColumns = Array.isArray(value.includeColumns) ? value.includeColumns : [];
  const allColumns = keyParts.every(
    (part) => part.kind === 'column' && typeof part.name === 'string',
  );
  if (allColumns && includeColumns.length === 0) {
    const { keyParts: _, includeColumns: __, ...legacy } = value;
    return {
      ...legacy,
      columns: keyParts.map((part) => String(part.name)),
    };
  }
  const { columns: _, expressions: __, ...lossless } = value;
  return { ...lossless, includeColumns };
}

function indexKeyParts(value: Record<string, unknown>): CatalogIndexKeyPart[] | null {
  if (Array.isArray(value.keyParts)) return value.keyParts as CatalogIndexKeyPart[];
  if (Array.isArray(value.columns)) {
    return value.columns
      .filter((column): column is string => typeof column === 'string')
      .map((name) => ({ kind: 'column', name }));
  }
  return null;
}

function indexHasUnsupportedForm(value: Record<string, unknown>): boolean {
  const keyParts = indexKeyParts(value);
  return Boolean(
    value.predicate ||
    (Array.isArray(value.includeColumns) && value.includeColumns.length > 0) ||
    keyParts?.some((part) => part.kind === 'expression') ||
    (Array.isArray(value.expressions) && value.expressions.length > 0),
  );
}

function indexColumns(value: Record<string, unknown>): readonly string[] | null {
  const keyParts = indexKeyParts(value);
  if (!keyParts || keyParts.some((part) => part.kind !== 'column' || typeof part.name !== 'string')) return null;
  return keyParts.map((part) => String(part.name));
}

function recursivelyCanonicalize(
  value: unknown,
  path: readonly string[] = [],
  context: CanonicalizationContext = {},
): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => recursivelyCanonicalize(item, [...path, '[]'], context));
    const sortableCollections = new Set([
      'schemas', 'tables', 'primaryKeys', 'uniqueConstraints', 'indexes',
      'foreignKeys', 'functions', 'triggers', 'events',
    ]);
    const field = collectionField(path);
    if (sortableCollections.has(field ?? '')) {
      if (field === 'events' || field === 'schemas') {
        const primitiveItems = items.map((item) => {
          if (typeof item !== 'string' || item.length === 0) {
            throw new Error(`INCOMPLETE_IDENTITY: ${field} contains an invalid identity.`);
          }
          return item;
        });
        if (new Set(primitiveItems).size !== primitiveItems.length) {
          throw new Error(`DUPLICATE_IDENTITY: ${field} contains duplicate membership.`);
        }
        return [...primitiveItems].sort(compareIdentity);
      }
      assertUniqueIdentities(path, items, context);
      return [...items].sort((left, right) =>
        compareIdentity(
          collectionIdentity(path, left as Record<string, unknown>, context),
          collectionIdentity(path, right as Record<string, unknown>, context),
        ));
    }
    return items;
  }
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    const objectContext = path.at(-2) === 'tables'
      ? {
          ...context,
          tableSchema: typeof object.schema === 'string' && object.schema.length > 0
            ? object.schema
            : context.defaultSchema,
          tableName: typeof object.name === 'string' ? object.name : undefined,
        }
      : context;
    const normalized = Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => key !== 'constraintBacked')
        .map((key) => [key, recursivelyCanonicalize(object[key], [...path, key], objectContext)]),
    );
    if (path.at(-2) === 'indexes') return canonicalIndexShape(normalized);
    return normalized;
  }
  return value;
}

export function canonicalizeScope(scope: ManifestScope): ManifestScope {
  const schemas = scope.schemas;
  const defaultSchema = Array.isArray(schemas) && schemas.length === 1 && typeof schemas[0] === 'string'
    ? schemas[0]
    : undefined;
  return recursivelyCanonicalize(scope, [], { defaultSchema }) as ManifestScope;
}

export function serializeCanonicalScope(scope: ManifestScope): string {
  return JSON.stringify(canonicalizeScope(scope));
}

export function fingerprintCanonicalScope(scope: ManifestScope): string {
  return createHash('sha256').update(serializeCanonicalScope(scope), 'utf8').digest('hex');
}

function normalizeDefault(value: unknown, declaredType: unknown): unknown {
  if (typeof value !== 'string' || typeof declaredType !== 'string') return value;
  const match = value.match(/^'(?:''|[^'])*'::([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (!match) return value;
  const castType = match[1].toLowerCase();
  const targetType = declaredType.toLowerCase().replace(/\(.*/, '');
  if (castType !== targetType && !(castType === 'varchar' && targetType === 'text')) return value;
  return value.slice(0, value.lastIndexOf('::'));
}

function isUnsupportedDefault(value: unknown, declaredType: unknown): boolean {
  if (typeof value !== 'string' || typeof declaredType !== 'string' || !value.includes('::')) return false;
  const match = value.match(/^'(?:''|[^'])*'::([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (!match) return true;
  const castType = match[1].toLowerCase();
  const targetType = declaredType.toLowerCase().replace(/\(.*/, '');
  return castType !== targetType && !(castType === 'varchar' && targetType === 'text');
}

function normalizeFunctionBody(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function normalizeCatalogScope(scope: CatalogScope): CatalogScope {
  const clone = structuredClone(scope) as Record<string, unknown>;
  const tables = Array.isArray(clone.tables) ? clone.tables : [];
  clone.tables = tables.map((table) => {
    const item = table as Record<string, unknown>;
    if (Array.isArray(item.columns)) {
      item.columns = item.columns.map((column) => {
        const c = column as Record<string, unknown>;
        return { ...c, default: normalizeDefault(c.default, c.type) };
      });
    }
    return item;
  });
  const functions = Array.isArray(clone.functions) ? clone.functions : [];
  clone.functions = functions.map((fn) => {
    const item = fn as Record<string, unknown>;
    return { ...item, body: normalizeFunctionBody(item.body) };
  });
  return clone as CatalogScope;
}

function difference(
  object: string,
  field: string,
  expected: unknown,
  actual: unknown,
  classification: SchemaFailureClass,
): SchemaDifference {
  return { object, field, expected, actual, classification };
}

function verifyUniqueSemantics(expected: ManifestScope, actual: CatalogScope): SchemaDifference[] {
  const expectedEntries = (expected.uniqueConstraints ?? []) as CatalogUniqueConstraint[];
  const indexes = (actual.indexes ?? []) as CatalogIndex[];
  const constraints = (actual.uniqueConstraints ?? []) as CatalogUniqueConstraint[];
  const differences: SchemaDifference[] = [];
  for (const semantic of expectedEntries) {
    const sameColumns = (item: { table: string; columns?: readonly string[]; keyParts?: readonly CatalogIndexKeyPart[] }) =>
      item.table === semantic.table &&
      JSON.stringify(indexColumns(item as Record<string, unknown>) ?? item.columns) === JSON.stringify(semantic.columns);
    const unsupported = indexes.filter(
      (item) =>
        item.unique &&
        (sameColumns(item) || (item.table === semantic.table && item.name === semantic.name)) &&
        indexHasUnsupportedForm(item as unknown as Record<string, unknown>),
    );
    if (unsupported.length > 0) {
      differences.push(
        difference(
          `${semantic.table}.${semantic.name}`,
          'unique',
          semantic,
          unsupported,
          'UNSUPPORTED_CATALOG_FORM',
        ),
      );
      continue;
    }
    const matches = [
      ...constraints.filter(sameColumns),
      ...indexes.filter((item) => item.unique && sameColumns(item) && !item.constraintBacked &&
        !indexHasUnsupportedForm(item as unknown as Record<string, unknown>)),
    ];
    if (matches.length === 0) differences.push(difference(`${semantic.table}.${semantic.name}`, 'unique', semantic, null, 'MISSING_OBJECT'));
    if (matches.length > 1) differences.push(difference(`${semantic.table}.${semantic.name}`, 'unique', semantic, matches, 'SEMANTIC_ATTRIBUTE_MISMATCH'));
  }
  return differences;
}

function verifyObjectPresence(expected: ManifestScope, actual: CatalogScope): SchemaDifference[] {
  const result: SchemaDifference[] = [];
  const schemas = expected.schemas;
  const context: CanonicalizationContext = {
    defaultSchema: Array.isArray(schemas) && schemas.length === 1 && typeof schemas[0] === 'string'
      ? schemas[0]
      : undefined,
  };
  for (const field of ['tables', 'indexes', 'foreignKeys', 'functions', 'triggers']) {
    const expectedItems = ((expected[field] ?? []) as Array<Record<string, unknown>>);
    const actualItems = ((actual[field] ?? []) as Array<Record<string, unknown>>);
    assertUniqueIdentities([field], expectedItems, context);
    assertUniqueIdentities([field], actualItems, context);
    const key = (item: Record<string, unknown>) => collectionIdentity([field], item, context);
    const expectedKeys = new Set(expectedItems.map(key));
    const actualKeys = new Set(actualItems.map(key));
    for (const item of expectedItems) {
      if (!actualKeys.has(key(item))) {
        result.push(difference(`${field}.${key(item).replaceAll('\0', '.')}`, 'presence', item, null, 'MISSING_OBJECT'));
      }
    }
    for (const item of actualItems) {
      if (!expectedKeys.has(key(item))) {
        result.push(difference(`${field}.${key(item).replaceAll('\0', '.')}`, 'presence', null, item, 'UNEXPECTED_OBJECT'));
      }
    }
  }
  const constraints = (scope: ManifestScope) => [
    ...((scope.tables ?? []) as Array<Record<string, unknown>>).flatMap((table) =>
      ((table.primaryKeys ?? []) as Array<Record<string, unknown>>).map((constraint) => ({
        ...constraint,
        schema: constraint.schema ?? table.schema,
        table: constraint.table ?? table.name,
        type: 'p',
      }))),
    ...((scope.foreignKeys ?? []) as Array<Record<string, unknown>>).map((constraint) => ({
      ...constraint,
      type: 'f',
    })),
  ];
  const expectedConstraints = constraints(expected);
  const actualConstraints = constraints(actual);
  const expectedConstraintKeys = new Set(expectedConstraints.map((item) =>
    `constraint\0${schemaIdentity(item, context)}\0${requiredIdentityString(item, 'table', 'constraints')}\0${item.type}\0${requiredIdentityString(item, 'name', 'constraints')}`));
  const actualConstraintKeys = new Set(actualConstraints.map((item) =>
    `constraint\0${schemaIdentity(item, context)}\0${requiredIdentityString(item, 'table', 'constraints')}\0${item.type}\0${requiredIdentityString(item, 'name', 'constraints')}`));
  for (const key of expectedConstraintKeys) {
    if (!actualConstraintKeys.has(key)) result.push(difference(`constraints.${key.replaceAll('\0', '.')}`, 'presence', key, null, 'MISSING_OBJECT'));
  }
  for (const key of actualConstraintKeys) {
    if (!expectedConstraintKeys.has(key)) result.push(difference(`constraints.${key.replaceAll('\0', '.')}`, 'presence', null, key, 'UNEXPECTED_OBJECT'));
  }
  return result;
}

function projectSemanticUniqueConstraints(
  expected: ManifestScope,
  actual: CatalogScope,
): CatalogScope {
  const semanticEntries = (expected.uniqueConstraints ?? []) as CatalogUniqueConstraint[];
  const indexes = (actual.indexes ?? []) as CatalogIndex[];
  const constraints = (actual.uniqueConstraints ?? []) as CatalogUniqueConstraint[];
  const projected = semanticEntries.filter((semantic) =>
    [...constraints, ...indexes].some(
      (item) =>
        item.table === semantic.table &&
        JSON.stringify(indexColumns(item as unknown as Record<string, unknown>) ?? item.columns) === JSON.stringify(semantic.columns) &&
        (!('unique' in item) || item.unique) &&
        !('predicate' in item && item.predicate) &&
        !(
          'expressions' in item &&
          Array.isArray(item.expressions) &&
          item.expressions.length > 0
        ),
    ),
  );
  return { ...actual, uniqueConstraints: projected };
}

export function verifyCatalogAgainstManifest(
  manifest: ManifestScope,
  catalog: CatalogScope,
  provenance: SchemaVerificationProvenance,
): SchemaVerificationResult {
  const rawCatalog = catalog;
  const physical = normalizeCatalogScope(catalog);
  const differences = [
    ...verifyObjectPresence(manifest, physical),
    ...verifyUniqueSemantics(manifest, physical),
  ];
  for (const table of (rawCatalog.tables ?? []) as Array<Record<string, unknown>>) {
    for (const column of (table.columns ?? []) as Array<Record<string, unknown>>) {
      if (isUnsupportedDefault(column.default, column.type)) {
        differences.push(difference(
          `${String(table.name)}.${String(column.name)}`,
          'default',
          null,
          column.default,
          'UNSUPPORTED_CATALOG_FORM',
        ));
      } else {
        const expectedTable = ((manifest.tables ?? []) as Array<Record<string, unknown>>)
          .find((item) => item.name === table.name);
        const expectedColumn = ((expectedTable?.columns ?? []) as Array<Record<string, unknown>>)
          .find((item) => item.name === column.name);
        const normalizedDefault = normalizeDefault(column.default, column.type);
        if (expectedColumn && expectedColumn.default !== normalizedDefault &&
            typeof column.default === 'string' && column.default.includes('::')) {
          differences.push(difference(
            `${String(table.name)}.${String(column.name)}`,
            'default',
            expectedColumn.default,
            column.default,
            'NORMALIZATION_MISMATCH',
          ));
        }
      }
    }
  }
  const normalized = projectSemanticUniqueConstraints(manifest, physical);
  const expected = serializeCanonicalScope(manifest);
  const actual = serializeCanonicalScope(normalized);
  if (expected !== actual) {
    const hasStructuralDifference = differences.some((item) =>
      item.classification === 'MISSING_OBJECT' || item.classification === 'UNEXPECTED_OBJECT' ||
      item.classification === 'NORMALIZATION_MISMATCH' || item.classification === 'UNSUPPORTED_CATALOG_FORM');
    if (!hasStructuralDifference) {
      differences.push(difference('scope', 'canonicalRepresentation', expected, actual, 'SEMANTIC_ATTRIBUTE_MISMATCH'));
    }
  }
  return {
    match: differences.length === 0,
    representation: actual,
    fingerprint: fingerprintCanonicalScope(normalized),
    differences,
    provenance,
  };
}
