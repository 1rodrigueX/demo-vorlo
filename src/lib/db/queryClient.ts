import "server-only";
import { Pool, type PoolClient } from "pg";
import type { Database } from "@/types/database.types";

/** Tabelas do schema public, pra tipar `.from()` como o supabase-js fazia. */
type PublicTables = Database["public"]["Tables"];
type TableName = keyof PublicTables;
type RowOf<K extends TableName> = PublicTables[K]["Row"];

/**
 * Camada de compatibilidade: expõe a mesma API encadeável do supabase-js
 * (`.from(t).select().eq()...` devolvendo `{ data, error }`) executando SQL
 * puro por baixo, via um pool `pg`.
 *
 * Por que um shim em vez de reescrever as 673 consultas à mão: concentra todo
 * o risco da migração num arquivo testável, em vez de espalhá-lo por 150
 * arquivos onde um filtro invertido passaria despercebido. Os call sites não
 * mudam de forma — só a implementação de createAdminClient troca por baixo.
 *
 * Cobre o subconjunto do PostgREST que o projeto realmente usa (medido: eq,
 * select, insert, update, delete, upsert, order, limit, range, in, or, not,
 * ilike, is, contains, match, single, maybeSingle, count/head e rpc), incluindo
 * os `select` com relação embutida no padrão `alias:tabela(colunas)` — que aqui
 * são sempre "muitos-para-um" com a FK chamada `{alias}_id`.
 */

const globalForPool = globalThis as unknown as { __pgPool?: Pool };

function getPool(): Pool {
  if (!globalForPool.__pgPool) {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DIRECT_URL/DATABASE_URL não configuradas");
    globalForPool.__pgPool = new Pool({ connectionString, max: 10 });
  }
  return globalForPool.__pgPool;
}

export type QueryResult<T> = { data: T | null; error: PgError | null; count?: number | null };
export type PgError = { message: string; code?: string; details?: string };

type Filter = { op: string; column: string; value: unknown };
type OrderBy = { column: string; ascending: boolean };
type Operation = "select" | "insert" | "update" | "delete" | "upsert";

/** Um pedaço `alias:tabela(col1, col2)` de um select embutido. */
type Embed = { alias: string; table: string; columns: string[] };

/** Aspas em identificador, barrando o que não for um nome de coluna/tabela válido. */
function ident(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Identificador inválido: ${name}`);
  }
  return `"${name}"`;
}

/**
 * Separa a lista de colunas de um `.select()` em colunas simples e relações
 * embutidas. "id, name, stage:pipeline_stages(name)" → colunas [id, name] +
 * embed { alias: stage, table: pipeline_stages, columns: [name] }.
 */
function parseSelect(select: string): { columns: string[]; embeds: Embed[] } {
  const columns: string[] = [];
  const embeds: Embed[] = [];

  let depth = 0;
  let current = "";
  const parts: string[] = [];
  for (const ch of select) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);

  for (const raw of parts) {
    const part = raw.trim();
    const embedMatch = part.match(/^(\w+):(\w+)\(([^)]*)\)$/);
    if (embedMatch) {
      embeds.push({
        alias: embedMatch[1],
        table: embedMatch[2],
        columns: embedMatch[3].split(",").map((c) => c.trim()).filter(Boolean),
      });
    } else if (part && part !== "*") {
      columns.push(part);
    } else if (part === "*") {
      columns.push("*");
    }
  }

  return { columns, embeds };
}

class QueryBuilder<TRow, TResult = TRow[]> implements PromiseLike<QueryResult<TResult>> {
  private operation: Operation = "select";
  private selectStr = "*";
  private selectRequested = false;
  private payload: Record<string, unknown>[] = [];
  private filters: Filter[] = [];
  private orderBys: OrderBy[] = [];
  private limitN: number | null = null;
  private rangeFromTo: [number, number] | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private countMode: "exact" | null = null;
  private headOnly = false;
  private conflictTarget: string | null = null;
  private ignoreDuplicates = false;
  private readonly table: string;

  constructor(table: string) {
    this.table = table;
  }

  /**
   * `S` deixa o call site declarar o formato quando o select traz relação
   * embutida (ex: `.select<DealComContato>("id, contact:contacts(name)")`) —
   * o shim não infere isso da string. Sem `S`, devolve a Row da tabela, que
   * cobre a esmagadora maioria das consultas.
   */
  select<S = TRow>(str = "*", opts?: { count?: "exact"; head?: boolean }): QueryBuilder<S, S[]> {
    this.selectStr = str || "*";
    this.selectRequested = true;
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.headOnly = true;
    return this as unknown as QueryBuilder<S, S[]>;
  }

  insert(rows: Record<string, unknown> | Record<string, unknown>[]): this {
    this.operation = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(patch: Record<string, unknown>): this {
    this.operation = "update";
    this.payload = [patch];
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  upsert(
    rows: Record<string, unknown> | Record<string, unknown>[],
    opts?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    this.operation = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.conflictTarget = opts?.onConflict ?? null;
    this.ignoreDuplicates = opts?.ignoreDuplicates ?? false;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ op: "eq", column, value });
    return this;
  }
  neq(column: string, value: unknown): this {
    this.filters.push({ op: "neq", column, value });
    return this;
  }
  gt(column: string, value: unknown): this {
    this.filters.push({ op: "gt", column, value });
    return this;
  }
  gte(column: string, value: unknown): this {
    this.filters.push({ op: "gte", column, value });
    return this;
  }
  lt(column: string, value: unknown): this {
    this.filters.push({ op: "lt", column, value });
    return this;
  }
  lte(column: string, value: unknown): this {
    this.filters.push({ op: "lte", column, value });
    return this;
  }
  like(column: string, value: string): this {
    this.filters.push({ op: "like", column, value });
    return this;
  }
  ilike(column: string, value: string): this {
    this.filters.push({ op: "ilike", column, value });
    return this;
  }
  is(column: string, value: null | boolean): this {
    this.filters.push({ op: "is", column, value });
    return this;
  }
  in(column: string, values: unknown[]): this {
    this.filters.push({ op: "in", column, value: values });
    return this;
  }
  not(column: string, operator: string, value: unknown): this {
    this.filters.push({ op: `not.${operator}`, column, value });
    return this;
  }
  contains(column: string, value: unknown): this {
    this.filters.push({ op: "contains", column, value });
    return this;
  }
  match(query: Record<string, unknown>): this {
    for (const [column, value] of Object.entries(query)) {
      this.filters.push({ op: "eq", column, value });
    }
    return this;
  }
  /** `.or("a.eq.1,b.eq.2")` — sintaxe do PostgREST, um OR de condições. */
  or(conditions: string): this {
    this.filters.push({ op: "or", column: "", value: conditions });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this.orderBys.push({ column, ascending: opts?.ascending ?? true });
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number): this {
    this.rangeFromTo = [from, to];
    return this;
  }

  single(): QueryBuilder<TRow, TRow> {
    this.mode = "single";
    return this as unknown as QueryBuilder<TRow, TRow>;
  }
  maybeSingle(): QueryBuilder<TRow, TRow | null> {
    this.mode = "maybeSingle";
    return this as unknown as QueryBuilder<TRow, TRow | null>;
  }

  // ── Construção do WHERE ────────────────────────────────────────────────
  private buildWhere(params: unknown[]): string {
    if (!this.filters.length) return "";
    const clauses = this.filters.map((f) => this.filterSql(f, params));
    return " WHERE " + clauses.join(" AND ");
  }

  private filterSql(f: Filter, params: unknown[]): string {
    const col = f.op === "or" ? "" : ident(f.column);
    switch (f.op) {
      case "eq":
        if (f.value === null) return `${col} IS NULL`;
        params.push(f.value);
        return `${col} = $${params.length}`;
      case "neq":
        params.push(f.value);
        return `${col} <> $${params.length}`;
      case "gt":
        params.push(f.value);
        return `${col} > $${params.length}`;
      case "gte":
        params.push(f.value);
        return `${col} >= $${params.length}`;
      case "lt":
        params.push(f.value);
        return `${col} < $${params.length}`;
      case "lte":
        params.push(f.value);
        return `${col} <= $${params.length}`;
      case "like":
        params.push(f.value);
        return `${col} LIKE $${params.length}`;
      case "ilike":
        params.push(f.value);
        return `${col} ILIKE $${params.length}`;
      case "is":
        return `${col} IS ${f.value === null ? "NULL" : f.value ? "TRUE" : "FALSE"}`;
      case "in":
        params.push(f.value);
        return `${col} = ANY($${params.length})`;
      case "contains":
        params.push(JSON.stringify(f.value));
        return `${col} @> $${params.length}`;
      case "or":
        return `(${this.parseOrConditions(String(f.value), params)})`;
      default:
        if (f.op.startsWith("not.")) {
          const inner = f.op.slice(4);
          if (inner === "is") return `${col} IS NOT ${f.value === null ? "NULL" : f.value ? "TRUE" : "FALSE"}`;
          params.push(f.value);
          const sqlOp = { eq: "<>", gt: "<=", gte: "<", lt: ">=", lte: ">" }[inner] ?? "<>";
          return `${col} ${sqlOp} $${params.length}`;
        }
        throw new Error(`Filtro não suportado: ${f.op}`);
    }
  }

  /** "a.eq.1,b.gte.2" → "a = $n OR b >= $m". Subconjunto suficiente pro projeto. */
  private parseOrConditions(conditions: string, params: unknown[]): string {
    return conditions
      .split(",")
      .map((cond) => {
        const [column, operator, ...rest] = cond.split(".");
        const value = rest.join(".");
        const c = ident(column);
        switch (operator) {
          case "eq":
            params.push(value);
            return `${c} = $${params.length}`;
          case "gt":
            params.push(value);
            return `${c} > $${params.length}`;
          case "gte":
            params.push(value);
            return `${c} >= $${params.length}`;
          case "lt":
            params.push(value);
            return `${c} < $${params.length}`;
          case "lte":
            params.push(value);
            return `${c} <= $${params.length}`;
          case "is":
            return `${c} IS ${value === "null" ? "NULL" : value === "true" ? "TRUE" : "FALSE"}`;
          case "ilike":
            params.push(value.replace(/\*/g, "%"));
            return `${c} ILIKE $${params.length}`;
          default:
            throw new Error(`Operador OR não suportado: ${operator}`);
        }
      })
      .join(" OR ");
  }

  private buildOrderLimit(): string {
    let sql = "";
    if (this.orderBys.length) {
      sql +=
        " ORDER BY " +
        this.orderBys.map((o) => `${ident(o.column)} ${o.ascending ? "ASC" : "DESC"}`).join(", ");
    }
    if (this.rangeFromTo) {
      const [from, to] = this.rangeFromTo;
      sql += ` LIMIT ${to - from + 1} OFFSET ${from}`;
    } else if (this.limitN != null) {
      sql += ` LIMIT ${this.limitN}`;
    }
    return sql;
  }

  // ── Execução ───────────────────────────────────────────────────────────
  private async run(): Promise<QueryResult<TResult>> {
    try {
      const pool = getPool();
      const rows = await this.execute(pool);
      return this.shape(rows) as QueryResult<TResult>;
    } catch (err) {
      const e = err as { message?: string; code?: string; detail?: string };
      return { data: null, error: { message: e.message ?? "erro", code: e.code, details: e.detail } };
    }
  }

  private async execute(pool: Pool | PoolClient): Promise<Record<string, unknown>[]> {
    const params: unknown[] = [];
    const t = ident(this.table);

    // Contagem pura (head) — não traz linhas.
    if (this.headOnly) {
      const where = this.buildWhere(params);
      const res = await pool.query(`SELECT count(*)::int AS count FROM ${t}${where}`, params);
      this._count = res.rows[0]?.count ?? 0;
      return [];
    }

    if (this.operation === "select") {
      const { columns, embeds } = parseSelect(this.selectStr);
      const baseCols = this.baseColumns(columns, embeds);
      const where = this.buildWhere(params);
      const countSelect = this.countMode ? ", count(*) OVER()::int AS __count" : "";
      const sql = `SELECT ${baseCols}${countSelect} FROM ${t}${where}${this.buildOrderLimit()}`;
      const res = await pool.query(sql, params);
      const rows = res.rows;
      if (this.countMode && rows.length) this._count = rows[0].__count;
      else if (this.countMode) this._count = 0;
      for (const r of rows) delete r.__count;
      if (embeds.length) await this.resolveEmbeds(pool, rows, embeds);
      return rows;
    }

    if (this.operation === "insert" || this.operation === "upsert") {
      return this.executeWrite(pool);
    }

    if (this.operation === "update") {
      const patch = this.payload[0] ?? {};
      const setCols = Object.keys(patch);
      const sets = setCols.map((c) => {
        params.push(patch[c]);
        return `${ident(c)} = $${params.length}`;
      });
      const where = this.buildWhere(params);
      const returning = this.returningClause();
      const res = await pool.query(`UPDATE ${t} SET ${sets.join(", ")}${where}${returning}`, params);
      return res.rows;
    }

    if (this.operation === "delete") {
      const where = this.buildWhere(params);
      const returning = this.returningClause();
      const res = await pool.query(`DELETE FROM ${t}${where}${returning}`, params);
      return res.rows;
    }

    return [];
  }

  private async executeWrite(pool: Pool | PoolClient): Promise<Record<string, unknown>[]> {
    if (!this.payload.length) return [];
    const t = ident(this.table);
    const cols = [...new Set(this.payload.flatMap((r) => Object.keys(r)))];
    const params: unknown[] = [];

    const valuesSql = this.payload
      .map((row) => {
        const placeholders = cols.map((c) => {
          params.push(this.encodeValue(row[c]));
          return `$${params.length}`;
        });
        return `(${placeholders.join(", ")})`;
      })
      .join(", ");

    let sql = `INSERT INTO ${t} (${cols.map(ident).join(", ")}) VALUES ${valuesSql}`;

    if (this.operation === "upsert") {
      const conflict = this.conflictTarget
        ? this.conflictTarget.split(",").map((c) => ident(c.trim())).join(", ")
        : "";
      if (this.ignoreDuplicates || !conflict) {
        sql += ` ON CONFLICT ${conflict ? `(${conflict})` : ""} DO NOTHING`;
      } else {
        const updates = cols.filter((c) => !this.conflictTarget!.split(",").map((x) => x.trim()).includes(c));
        sql += ` ON CONFLICT (${conflict}) DO UPDATE SET ${updates
          .map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`)
          .join(", ")}`;
      }
    }

    sql += this.returningClause();
    const res = await pool.query(sql, params);
    return res.rows;
  }

  /** jsonb precisa ir como string JSON; arrays/objetos idem. */
  private encodeValue(value: unknown): unknown {
    if (value !== null && typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return value;
  }

  private returningClause(): string {
    if (!this.selectRequested) return "";
    const { columns, embeds } = parseSelect(this.selectStr);
    return " RETURNING " + this.baseColumns(columns, embeds);
  }

  private baseColumns(columns: string[], embeds: Embed[]): string {
    const cols: string[] = [];
    if (!columns.length || columns.includes("*")) cols.push("*");
    else cols.push(...columns.map(ident));
    // A FK de cada embed precisa vir junto pra resolver a relação depois.
    for (const embed of embeds) {
      const fk = `${embed.alias}_id`;
      if (!cols.includes("*") && !cols.includes(ident(fk))) cols.push(ident(fk));
    }
    return cols.join(", ");
  }

  /**
   * Preenche as relações embutidas (muitos-para-um). Para cada embed, junta os
   * `{alias}_id` das linhas, busca a tabela alvo de uma vez e devolve o objeto
   * aninhado sob o alias — igual ao que o PostgREST entregaria.
   */
  private async resolveEmbeds(
    pool: Pool | PoolClient,
    rows: Record<string, unknown>[],
    embeds: Embed[],
  ): Promise<void> {
    for (const embed of embeds) {
      const fk = `${embed.alias}_id`;
      const ids = [...new Set(rows.map((r) => r[fk]).filter((v) => v != null))];

      if (!ids.length) {
        for (const r of rows) r[embed.alias] = null;
        continue;
      }

      const cols = embed.columns.length ? embed.columns : ["*"];
      const selectCols = cols.includes("*") ? "*" : ["id", ...cols].map(ident).join(", ");
      const res = await pool.query(
        `SELECT ${selectCols} FROM ${ident(embed.table)} WHERE "id" = ANY($1)`,
        [ids],
      );
      const byId = new Map(res.rows.map((row) => [row.id, row]));
      for (const r of rows) {
        const related = byId.get(r[fk]);
        r[embed.alias] = related
          ? Object.fromEntries(cols.includes("*") ? Object.entries(related) : cols.map((c) => [c, related[c]]))
          : null;
      }
    }
  }

  private _count: number | null = null;

  /** Ajusta o retorno pro formato que o call site espera (single/maybeSingle/lista). */
  private shape(rows: Record<string, unknown>[]): QueryResult<unknown> {
    const count = this.countMode || this.headOnly ? this._count : undefined;

    if (this.headOnly) return { data: null, error: null, count };

    // Escrita sem .select() → data null, sem erro (igual ao supabase-js).
    if (this.operation !== "select" && !this.selectRequested) {
      return { data: null, error: null };
    }

    if (this.mode === "single") {
      if (rows.length !== 1) {
        return {
          data: null,
          error: { message: `Esperava 1 linha, veio ${rows.length}`, code: "PGRST116" },
          count,
        };
      }
      return { data: rows[0], error: null, count };
    }
    if (this.mode === "maybeSingle") {
      if (rows.length > 1) {
        return { data: null, error: { message: "Mais de uma linha", code: "PGRST116" }, count };
      }
      return { data: rows[0] ?? null, error: null, count };
    }

    return { data: rows, error: null, count };
  }

  then<R1 = QueryResult<TResult>, R2 = never>(
    onfulfilled?: ((value: QueryResult<TResult>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

/** Chama uma função do Postgres (o equivalente do supabase.rpc). */
async function callRpc(fn: string, args?: Record<string, unknown>): Promise<QueryResult<unknown>> {
  try {
    const pool = getPool();
    const entries = Object.entries(args ?? {});
    const params = entries.map(([, v]) => v);
    const named = entries.map(([k], i) => `${ident(k)} => $${i + 1}`).join(", ");
    const res = await pool.query(`SELECT * FROM ${ident(fn)}(${named})`, params);

    // Função escalar (uma coluna com o nome da função) → devolve o valor puro.
    if (res.rows.length === 1 && res.fields.length === 1 && res.fields[0].name === fn) {
      return { data: res.rows[0][fn], error: null };
    }
    return { data: res.rows, error: null };
  } catch (err) {
    const e = err as { message?: string; code?: string };
    return { data: null, error: { message: e.message ?? "erro", code: e.code } };
  }
}

/**
 * Cliente compatível com a fatia do supabase-js que o projeto usa. Devolvido
 * por createAdminClient no lugar do cliente de service role do Supabase.
 */
export function createQueryClient() {
  return {
    from<K extends TableName>(table: K): QueryBuilder<RowOf<K>> {
      return new QueryBuilder<RowOf<K>>(table);
    },
    rpc(fn: string, args?: Record<string, unknown>) {
      return callRpc(fn, args);
    },
  };
}

export type QueryClient = ReturnType<typeof createQueryClient>;
