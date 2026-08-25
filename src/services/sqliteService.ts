import { fileSystemService } from './fileSystem';

let sqliteModule: any = null;
let db: any = null;

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowsAffected?: number;
  error?: string;
  executionTimeMs: number;
}

export interface TableInfo {
  name: string;
  columns: { name: string; type: string; notNull: boolean; pk: boolean }[];
  rowCount: number;
}

/**
 * Safely split SQL into statements without breaking on semicolons inside strings or comments
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (!inSingleQuote && !inDoubleQuote && !inBlockComment && char === '-' && nextChar === '-') {
      inLineComment = true;
    } else if (inLineComment && (char === '\n' || char === '\r')) {
      inLineComment = false;
    } else if (!inSingleQuote && !inDoubleQuote && !inLineComment && char === '/' && nextChar === '*') {
      inBlockComment = true;
      i++;
    } else if (inBlockComment && char === '*' && nextChar === '/') {
      inBlockComment = false;
      i++;
      continue;
    } else if (!inLineComment && !inBlockComment) {
      if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
      else if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
      else if (char === ';' && !inSingleQuote && !inDoubleQuote) {
        if (current.trim()) statements.push(current.trim());
        current = '';
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

class SQLiteService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const sqlite3InitModule = (await import('@sqlite.org/sqlite-wasm')).default;
        sqliteModule = await (sqlite3InitModule as any)({ print: () => {}, printErr: () => {} });
        const sqlite3 = sqliteModule.sqlite3;
        db = new sqlite3.oo1.DB();
        this.initialized = true;
        console.log('[SQLite] Initialized SQLite WASM');
      } catch (e) {
        console.warn('[SQLite] Failed to initialize SQLite WASM:', e);
        this.initialized = false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    await this.initialize();
    const start = performance.now();

    if (!db) {
      return {
        columns: ['error'],
        rows: [['SQLite WASM not available in this environment']],
        executionTimeMs: 0,
        error: 'SQLite not initialized'
      };
    }

    const statements = splitSqlStatements(sql.trim());
    if (statements.length === 0) {
      return { columns: [], rows: [], executionTimeMs: 0 };
    }

    let lastResult: QueryResult = { columns: [], rows: [], executionTimeMs: 0 };

    for (const stmt of statements) {
      try {
        const rows: any[][] = [];
        let columns: string[] = [];

        db.exec({
          sql: stmt,
          columnNames: columns,
          resultRows: rows,
        });

        lastResult = {
          columns,
          rows,
          rowsAffected: db.changes(),
          executionTimeMs: Math.round(performance.now() - start)
        };
      } catch (e: any) {
        return {
          columns: ['error'],
          rows: [[e.message || String(e)]],
          executionTimeMs: Math.round(performance.now() - start),
          error: e.message
        };
      }
    }

    return lastResult;
  }

  async getTables(): Promise<TableInfo[]> {
    await this.initialize();
    if (!db) return [];

    const result = await this.executeQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );

    const tables: TableInfo[] = [];
    for (const row of result.rows) {
      const tableName = row[0] as string;
      const colResult = await this.executeQuery(`PRAGMA table_info("${tableName}")`);
      const countResult = await this.executeQuery(`SELECT COUNT(*) FROM "${tableName}"`);

      const columns = colResult.rows.map(r => ({
        name: String(r[1]),
        type: String(r[2]),
        notNull: Boolean(r[3]),
        pk: Boolean(r[5])
      }));

      tables.push({
        name: tableName,
        columns,
        rowCount: countResult.rows[0]?.[0] ?? 0
      });
    }
    return tables;
  }

  async loadSQLFile(path: string): Promise<QueryResult> {
    const file = fileSystemService.getFileByPath(path);
    if (!file) return { columns: ['error'], rows: [['File not found']], executionTimeMs: 0, error: 'File not found' };
    return this.executeQuery(file.content || '');
  }

  // --- Data Editing & Mutation Helpers (Phase 63) ---

  async updateCell(tableName: string, pkColumn: string, pkValue: any, columnName: string, newValue: any): Promise<QueryResult> {
    const formattedVal = typeof newValue === 'number' ? newValue : `'${String(newValue).replace(/'/g, "''")}'`;
    const formattedPk = typeof pkValue === 'number' ? pkValue : `'${String(pkValue).replace(/'/g, "''")}'`;
    return this.executeQuery(`UPDATE "${tableName}" SET "${columnName}" = ${formattedVal} WHERE "${pkColumn}" = ${formattedPk}`);
  }

  async deleteRow(tableName: string, pkColumn: string, pkValue: any): Promise<QueryResult> {
    const formattedPk = typeof pkValue === 'number' ? pkValue : `'${String(pkValue).replace(/'/g, "''")}'`;
    return this.executeQuery(`DELETE FROM "${tableName}" WHERE "${pkColumn}" = ${formattedPk}`);
  }

  async insertRow(tableName: string, rowData: Record<string, any>): Promise<QueryResult> {
    const cols = Object.keys(rowData);
    const vals = cols.map(c => {
      const v = rowData[c];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return v;
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    return this.executeQuery(`INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')})`);
  }

  // --- Export & Import Capabilities (Phase 64) ---

  async exportTableToCsv(tableName: string): Promise<string> {
    const res = await this.executeQuery(`SELECT * FROM "${tableName}"`);
    if (res.error || !res.columns.length) return '';
    const header = res.columns.join(',');
    const rows = res.rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
    return [header, ...rows].join('\n');
  }

  async exportTableToJson(tableName: string): Promise<string> {
    const res = await this.executeQuery(`SELECT * FROM "${tableName}"`);
    if (res.error) return '[]';
    const jsonRows = res.rows.map(r => {
      const obj: Record<string, any> = {};
      res.columns.forEach((col, idx) => {
        obj[col] = r[idx];
      });
      return obj;
    });
    return JSON.stringify(jsonRows, null, 2);
  }

  async exportDatabaseBinary(): Promise<Uint8Array | null> {
    await this.initialize();
    if (!db) return null;
    try {
      if (typeof sqliteModule?.capi?.sqlite3_js_db_export === 'function') {
        return sqliteModule.capi.sqlite3_js_db_export(db);
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const sqliteService = new SQLiteService();
