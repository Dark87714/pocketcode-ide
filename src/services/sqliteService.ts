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

    const statements = sql.trim().split(';').map(s => s.trim()).filter(Boolean);
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
}

export const sqliteService = new SQLiteService();
