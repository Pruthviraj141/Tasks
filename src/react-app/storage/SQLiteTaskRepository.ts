import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { Task, CreateTaskInput, UpdateTaskInput } from "../types/task";
import type { TaskRepository } from "./TaskRepository";

const DB_NAME = "daymark_db";

export class SQLiteTaskRepository implements TaskRepository {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
      const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

      if (isConn) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(
          DB_NAME,
          false,
          "no-encryption",
          1,
          false
        );
      }

      await this.db.open();

      // Create table and indexes
      const createSchema = `
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          notes TEXT,
          isCompleted INTEGER NOT NULL DEFAULT 0,
          completedAt TEXT,
          scheduledDate TEXT,
          scheduledTime TEXT,
          durationMinutes INTEGER,
          dueDate TEXT,
          dueTime TEXT,
          reminderDate TEXT,
          reminderTime TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          sortOrder INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_sortOrder ON tasks(sortOrder);
        CREATE INDEX IF NOT EXISTS idx_tasks_isCompleted ON tasks(isCompleted);
      `;
      await this.db.execute(createSchema);
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize SQLite database", error);
      throw error;
    }
  }

  private mapRowToTask(row: Record<string, unknown>): Task {
    return {
      id: String(row.id),
      title: String(row.title),
      notes: row.notes ? String(row.notes) : undefined,
      isCompleted: Boolean(row.isCompleted),
      completedAt: row.completedAt ? String(row.completedAt) : undefined,
      scheduledDate: row.scheduledDate ? String(row.scheduledDate) : undefined,
      scheduledTime: row.scheduledTime ? String(row.scheduledTime) : undefined,
      durationMinutes: row.durationMinutes !== null && row.durationMinutes !== undefined 
        ? Number(row.durationMinutes) 
        : undefined,
      dueDate: row.dueDate ? String(row.dueDate) : undefined,
      dueTime: row.dueTime ? String(row.dueTime) : undefined,
      reminderDate: row.reminderDate ? String(row.reminderDate) : undefined,
      reminderTime: row.reminderTime ? String(row.reminderTime) : undefined,
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
      sortOrder: Number(row.sortOrder || 0),
    };
  }

  async getTasks(): Promise<Task[]> {
    await this.init();
    if (!this.db) throw new Error("Database not connected");

    const query = `SELECT * FROM tasks ORDER BY sortOrder ASC, createdAt DESC;`;
    const res = await this.db.query(query);
    const rows = (res.values as Record<string, unknown>[]) || [];
    return rows.map((r) => this.mapRowToTask(r));
  }

  async getTaskById(id: string): Promise<Task | null> {
    await this.init();
    if (!this.db) throw new Error("Database not connected");

    const query = `SELECT * FROM tasks WHERE id = ?;`;
    const res = await this.db.query(query, [id]);
    const rows = (res.values as Record<string, unknown>[]) || [];
    if (rows.length === 0) return null;
    return this.mapRowToTask(rows[0]);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    if (!this.db) throw new Error("Database not connected");

    const now = new Date().toISOString();
    const id = "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);

    // Get lowest sort order to place at top
    const sortRes = await this.db.query(`SELECT MIN(sortOrder) as minSort FROM tasks;`);
    const minSort = (sortRes.values?.[0]?.minSort as number) ?? 0;
    const sortOrder = minSort - 1;

    const task: Task = {
      id,
      title: input.title.trim(),
      notes: input.notes?.trim() || undefined,
      isCompleted: false,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      durationMinutes: input.durationMinutes,
      dueDate: input.dueDate,
      dueTime: input.dueTime,
      reminderDate: input.reminderDate,
      reminderTime: input.reminderTime,
      createdAt: now,
      updatedAt: now,
      sortOrder,
    };

    const insertSql = `
      INSERT INTO tasks (
        id, title, notes, isCompleted, completedAt,
        scheduledDate, scheduledTime, durationMinutes,
        dueDate, dueTime, reminderDate, reminderTime,
        createdAt, updatedAt, sortOrder
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    await this.db.run(insertSql, [
      task.id,
      task.title,
      task.notes ?? null,
      0,
      null,
      task.scheduledDate ?? null,
      task.scheduledTime ?? null,
      task.durationMinutes ?? null,
      task.dueDate ?? null,
      task.dueTime ?? null,
      task.reminderDate ?? null,
      task.reminderTime ?? null,
      task.createdAt,
      task.updatedAt,
      task.sortOrder,
    ]);

    return task;
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    await this.init();
    if (!this.db) throw new Error("Database not connected");

    const existing = await this.getTaskById(id);
    if (!existing) throw new Error(`Task ${id} not found`);

    const now = new Date().toISOString();
    let completedAt = existing.completedAt;
    if (input.isCompleted !== undefined) {
      completedAt = input.isCompleted ? (existing.completedAt || now) : undefined;
    }

    const updated: Task = {
      ...existing,
      ...input,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      notes: input.notes !== undefined ? (input.notes.trim() || undefined) : existing.notes,
      completedAt,
      updatedAt: now,
    };

    const updateSql = `
      UPDATE tasks SET
        title = ?,
        notes = ?,
        isCompleted = ?,
        completedAt = ?,
        scheduledDate = ?,
        scheduledTime = ?,
        durationMinutes = ?,
        dueDate = ?,
        dueTime = ?,
        reminderDate = ?,
        reminderTime = ?,
        updatedAt = ?,
        sortOrder = ?
      WHERE id = ?;
    `;

    await this.db.run(updateSql, [
      updated.title,
      updated.notes ?? null,
      updated.isCompleted ? 1 : 0,
      updated.completedAt ?? null,
      updated.scheduledDate ?? null,
      updated.scheduledTime ?? null,
      updated.durationMinutes ?? null,
      updated.dueDate ?? null,
      updated.dueTime ?? null,
      updated.reminderDate ?? null,
      updated.reminderTime ?? null,
      updated.updatedAt,
      updated.sortOrder,
      id,
    ]);

    return updated;
  }

  async toggleTask(id: string): Promise<Task> {
    const existing = await this.getTaskById(id);
    if (!existing) throw new Error(`Task ${id} not found`);

    return this.updateTask(id, {
      isCompleted: !existing.isCompleted,
    });
  }

  async deleteTask(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not connected");

    await this.db.run(`DELETE FROM tasks WHERE id = ?;`, [id]);
  }

  async reorderTasks(orderedIds: string[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not connected");

    for (let index = 0; index < orderedIds.length; index++) {
      await this.db.run(
        `UPDATE tasks SET sortOrder = ? WHERE id = ?;`,
        [index, orderedIds[index]]
      );
    }
  }
}
