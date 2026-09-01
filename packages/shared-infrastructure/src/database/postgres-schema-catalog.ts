export interface PostgresQueryClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ readonly rows: readonly T[] }>;
}

export interface PostgresCatalog {
  readonly database: string;
  readonly serverVersion: string;
  readonly scope: Record<string, unknown>;
}

const APPLICATION_TABLES = [
  'AuditLog',
  'Calculation',
  'DurableCalculationSnapshot',
  'Project',
  'ProjectMember',
  'Session',
  'Structure',
  'User',
] as const;

const quoteLiteral = (value: string) => `'${value.replaceAll("'", "''")}'`;

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string' || !value.startsWith('{') || !value.endsWith('}')) return [];
  const result: string[] = [];
  let item = '';
  let quoted = false;
  let escaped = false;
  for (const character of value.slice(1, -1)) {
    if (escaped) {
      item += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      result.push(item);
      item = '';
    } else {
      item += character;
    }
  }
  if (escaped) item += '\\';
  if (item.length > 0 || value !== '{}') result.push(item);
  return result;
}

function asKeyParts(value: unknown): Array<{ kind: 'column' | 'expression'; name?: string; expression?: string }> {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is { kind: 'column' | 'expression'; name?: string; expression?: string } =>
        Boolean(item) &&
        typeof item === 'object' &&
        (item as Record<string, unknown>).kind === 'column' ||
        (Boolean(item) &&
          typeof item === 'object' &&
          (item as Record<string, unknown>).kind === 'expression'),
    );
  }
  if (typeof value !== 'string') return [];
  try {
    return asKeyParts(JSON.parse(value));
  } catch {
    return asStringArray(value).map((name) => ({ kind: 'column' as const, name }));
  }
}

function action(value: unknown): string {
  return ({ a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT' } as Record<string, string>)[String(value)] ?? 'UNKNOWN';
}

export async function extractPostgresCatalog(client: PostgresQueryClient): Promise<PostgresCatalog> {
  const identity = (await client.query<{ database: string; server_version: string }>(
    'select current_database() as database, version() as server_version',
  )).rows[0];
  if (!identity) throw new Error('UNKNOWN: PostgreSQL identity could not be established.');

  const tableList = APPLICATION_TABLES.map(quoteLiteral).join(',');
  const columns = (await client.query<Record<string, unknown>>(
    `select c.relname as table_name, a.attname as column_name,
      format_type(a.atttypid,a.atttypmod) as column_type,
      not a.attnotnull as nullable,
      nullif(pg_get_expr(d.adbin,d.adrelid),'') as default_expression
     from pg_class c
     join pg_namespace n on n.oid=c.relnamespace
     join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
     left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
     where n.nspname='public' and c.relkind='r' and c.relname in (${tableList})
     order by c.relname,a.attnum`,
  )).rows;
  const primaryKeys = (await client.query<Record<string, unknown>>(
    `select c.conname as constraint_name, t.relname as table_name,
      array_agg(a.attname order by k.ordinality) as columns
     from pg_constraint c
     join pg_class t on t.oid=c.conrelid
     join pg_namespace n on n.oid=t.relnamespace
     cross join lateral unnest(c.conkey) with ordinality k(attnum, ordinality)
     join pg_attribute a on a.attrelid=t.oid and a.attnum=k.attnum
     where n.nspname='public' and c.contype='p' and t.relname in (${tableList})
     group by c.conname,t.relname order by t.relname,c.conname`,
  )).rows;
  const uniqueConstraints = (await client.query<Record<string, unknown>>(
    `select c.conname as constraint_name, t.relname as table_name,
      array_agg(a.attname order by k.ordinality) as columns
     from pg_constraint c
     join pg_class t on t.oid=c.conrelid
     join pg_namespace n on n.oid=t.relnamespace
     cross join lateral unnest(c.conkey) with ordinality k(attnum, ordinality)
     join pg_attribute a on a.attrelid=t.oid and a.attnum=k.attnum
     where n.nspname='public' and c.contype='u' and t.relname in (${tableList})
     group by c.conname,t.relname order by t.relname,c.conname`,
  )).rows;
  const foreignKeys = (await client.query<Record<string, unknown>>(
    `select c.conname as constraint_name, t.relname as table_name,
      rt.relname as referenced_table, c.confdeltype as on_delete_code,
      c.confupdtype as on_update_code,
      array_agg(a.attname order by k.ordinality) as columns,
      array_agg(ra.attname order by k.ordinality) as referenced_columns
     from pg_constraint c
     join pg_class t on t.oid=c.conrelid
     join pg_class rt on rt.oid=c.confrelid
     join pg_namespace n on n.oid=t.relnamespace
     cross join lateral unnest(c.conkey,c.confkey) with ordinality k(attnum, refattnum, ordinality)
     join pg_attribute a on a.attrelid=t.oid and a.attnum=k.attnum
     join pg_attribute ra on ra.attrelid=rt.oid and ra.attnum=k.refattnum
     where n.nspname='public' and c.contype='f' and t.relname in (${tableList})
     group by c.conname,t.relname,rt.relname,c.confdeltype,c.confupdtype
     order by t.relname,c.conname`,
  )).rows;
  const indexes = (await client.query<Record<string, unknown>>(
    `select i.relname as index_name, t.relname as table_name,
      x.indisunique as unique_index,
      coalesce(jsonb_agg(
        case when k.ordinality <= x.indnkeyatts then
          case when k.attnum > 0
            then jsonb_build_object('kind','column','name',a.attname)
            else jsonb_build_object(
              'kind','expression',
              'expression',pg_get_indexdef(x.indexrelid,k.ordinality,false)
            )
          end
        end order by k.ordinality
      ) filter (where k.ordinality <= x.indnkeyatts), '[]'::jsonb) as key_parts,
      coalesce(array_agg(a.attname order by k.ordinality)
        filter (where k.ordinality > x.indnkeyatts and a.attname is not null), '{}') as include_columns,
      bool_or(c.conindid is not null) as constraint_backed,
      bool_or(x.indpred is not null) as is_partial,
      bool_or(x.indexprs is not null) as is_expression,
      nullif(max(pg_get_expr(x.indpred,x.indrelid)),'') as predicate,
      bool_or(x.indexprs is not null) as has_index_expressions
     from pg_index x
     join pg_class i on i.oid=x.indexrelid
     join pg_class t on t.oid=x.indrelid
     join pg_namespace n on n.oid=t.relnamespace
     left join pg_constraint c on c.conindid=x.indexrelid and c.contype in ('p','u')
     left join lateral unnest(x.indkey) with ordinality k(attnum, ordinality) on true
     left join pg_attribute a on a.attrelid=t.oid and a.attnum=k.attnum and k.attnum > 0
     where n.nspname='public' and c.conindid is null and t.relname in (${tableList})
     group by i.relname,t.relname,x.indisunique,x.indexrelid,x.indrelid
     order by t.relname,i.relname`,
  )).rows;
  const functions = (await client.query<Record<string, unknown>>(
    `select p.proname as function_name, n.nspname as schema_name,
      pg_get_function_result(p.oid) as returns, l.lanname as language,
      p.prosrc as body
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     join pg_language l on l.oid=p.prolang
     where n.nspname='public' and p.proname='reject_durable_calculation_snapshot_mutation'
     order by p.proname`,
  )).rows;
  const triggers = (await client.query<Record<string, unknown>>(
    `select tr.tgname as trigger_name, t.relname as table_name,
      case when (tr.tgtype & 2) <> 0 then 'BEFORE'
           when (tr.tgtype & 64) <> 0 then 'INSTEAD' else 'AFTER' end as timing,
      array_remove(array[
        case when (tr.tgtype & 4) <> 0 then 'INSERT' end,
        case when (tr.tgtype & 8) <> 0 then 'DELETE' end,
        case when (tr.tgtype & 16) <> 0 then 'UPDATE' end,
        case when (tr.tgtype & 32) <> 0 then 'TRUNCATE' end
      ], null) as events,
      case when (tr.tgtype & 1) <> 0 then 'EACH ROW' else 'EACH STATEMENT' end as granularity,
      format('%I.%I', fnn.nspname, fn.proname) as function_name
     from pg_trigger tr join pg_class t on t.oid=tr.tgrelid
     join pg_namespace n on n.oid=t.relnamespace
     join pg_proc fn on fn.oid=tr.tgfoid join pg_namespace fnn on fnn.oid=fn.pronamespace
     where not tr.tgisinternal and n.nspname='public' and fnn.nspname='public' and t.relname in (${tableList})
     order by t.relname,tr.tgname`,
  )).rows;

  const tableScope = APPLICATION_TABLES.map((name) => {
    const tableColumns = columns
      .filter((row) => row.table_name === name)
      .map((row) => ({
        name: String(row.column_name),
        type: String(row.column_type),
        nullable: Boolean(row.nullable),
        default: row.default_expression == null ? null : String(row.default_expression),
      }));
    return {
      name,
      columns: tableColumns,
      primaryKeys: primaryKeys
        .filter((row) => row.table_name === name)
        .map((row) => ({ name: String(row.constraint_name), columns: asStringArray(row.columns) })),
    };
  });
  return {
    database: identity.database,
    serverVersion: identity.server_version,
    scope: {
      schemas: ['public'],
      tables: tableScope,
      uniqueConstraints: uniqueConstraints.map((row) => ({
        name: String(row.constraint_name), table: String(row.table_name), columns: asStringArray(row.columns),
      })),
      indexes: indexes.map((row) => ({
        name: String(row.index_name), table: String(row.table_name), unique: Boolean(row.unique_index),
        keyParts: asKeyParts(row.key_parts ?? row.columns),
        includeColumns: asStringArray(row.include_columns),
        ...(row.constraint_backed === undefined ? {} : { constraintBacked: Boolean(row.constraint_backed) }),
        ...(row.predicate == null ? {} : { predicate: String(row.predicate) }),
        ...(Boolean(row.is_expression ?? row.has_index_expressions) ? {} : {}),
      })),
      foreignKeys: foreignKeys.map((row) => ({
        name: String(row.constraint_name), table: String(row.table_name),
        columns: asStringArray(row.columns), referencedTable: String(row.referenced_table),
        referencedColumns: asStringArray(row.referenced_columns),
        onDelete: action(row.on_delete_code), onUpdate: action(row.on_update_code),
      })),
      functions: functions.map((row) => ({
        name: String(row.function_name), schema: String(row.schema_name), returns: String(row.returns),
        language: String(row.language), body: String(row.body),
      })),
      triggers: triggers.map((row) => ({
        name: String(row.trigger_name), table: String(row.table_name), timing: String(row.timing),
        events: asStringArray(row.events), granularity: String(row.granularity), function: String(row.function_name),
      })),
    },
  };
}
