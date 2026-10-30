import { supabase } from "../lib/supabaseClient";
import type { Task, CreateTaskInput, UpdateTaskInput } from "../types/task";
import type { TaskRepository } from "./TaskRepository";

interface DbTaskRow {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  is_completed: boolean;
  completed_at: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  due_date: string | null;
  due_time: string | null;
  reminder_date: string | null;
  reminder_time: string | null;
  time_zone: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export class SupabaseTaskRepository implements TaskRepository {
  private userId: string;
  private cacheKey: string;
  private memoryTasks: Task[] = [];
  private isInitialized = false;

  constructor(userId: string) {
    this.userId = userId;
    this.cacheKey = `daymark_user_tasks_${userId}`;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.loadFromLocalCache();
    this.isInitialized = true;
  }

  private loadFromLocalCache(): void {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (raw) {
        this.memoryTasks = JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Failed to read user tasks from local cache", e);
    }
  }

  private saveToLocalCache(tasks: Task[]): void {
    try {
      this.memoryTasks = tasks;
      localStorage.setItem(this.cacheKey, JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save user tasks to local cache", e);
    }
  }

  private mapRowToTask(row: DbTaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      notes: row.notes || undefined,
      isCompleted: row.is_completed,
      completedAt: row.completed_at || undefined,
      scheduledDate: row.scheduled_date || undefined,
      scheduledTime: row.scheduled_time || undefined,
      durationMinutes: row.duration_minutes !== null ? Number(row.duration_minutes) : undefined,
      dueDate: row.due_date || undefined,
      dueTime: row.due_time || undefined,
      reminderDate: row.reminder_date || undefined,
      reminderTime: row.reminder_time || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sortOrder: row.sort_order ?? 0,
    };
  }

  private mapTaskToRow(task: Task): DbTaskRow {
    return {
      id: task.id,
      user_id: this.userId,
      title: task.title,
      notes: task.notes || null,
      is_completed: task.isCompleted,
      completed_at: task.completedAt || null,
      scheduled_date: task.scheduledDate || null,
      scheduled_time: task.scheduledTime || null,
      duration_minutes: task.durationMinutes !== undefined ? task.durationMinutes : null,
      due_date: task.dueDate || null,
      due_time: task.dueTime || null,
      reminder_date: task.reminderDate || null,
      reminder_time: task.reminderTime || null,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
      sort_order: task.sortOrder,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    };
  }

  private async syncFromCloud(): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", this.userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase fetch failed, keeping cached tasks:", error.message);
        return [...this.memoryTasks].sort((a, b) => a.sortOrder - b.sortOrder);
      }

      const tasks = (data as DbTaskRow[]).map((r) => this.mapRowToTask(r));
      this.saveToLocalCache(tasks);
      return tasks;
    } catch (err) {
      console.warn("Network error during task fetch, using cache:", err);
      return [...this.memoryTasks].sort((a, b) => a.sortOrder - b.sortOrder);
    }
  }

  async getTasks(): Promise<Task[]> {
    await this.init();

    // Fast path: instant return from local memory/storage (0ms)
    if (this.memoryTasks.length > 0) {
      void this.syncFromCloud();
      return [...this.memoryTasks].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    // Cold start path
    return this.syncFromCloud();
  }

  async getTaskById(id: string): Promise<Task | null> {
    await this.init();

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("user_id", this.userId)
        .maybeSingle();

      if (error) {
        console.warn("Supabase fetch by ID failed, falling back to cache:", error.message);
        const cached = this.memoryTasks.find((t) => t.id === id);
        return cached ? { ...cached } : null;
      }

      if (!data) return null;
      return this.mapRowToTask(data as DbTaskRow);
    } catch (err) {
      console.warn("Network error during getTaskById, using cache:", err);
      const cached = this.memoryTasks.find((t) => t.id === id);
      return cached ? { ...cached } : null;
    }
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    const now = new Date().toISOString();
    const nextSortOrder =
      this.memoryTasks.length > 0
        ? Math.min(...this.memoryTasks.map((t) => t.sortOrder)) - 1
        : 0;

    const newTask: Task = {
      id: "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
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
      sortOrder: nextSortOrder,
    };

    const row = this.mapTaskToRow(newTask);

    // 1. Instant local cache & memory save (0ms local latency)
    const updated = [newTask, ...this.memoryTasks];
    this.saveToLocalCache(updated);

    // 2. Asynchronous cloud sync in background
    void Promise.resolve(supabase.from("tasks").insert(row)).then(
      ({ error }) => {
        if (error) console.warn("Background cloud task creation warning:", error.message);
      },
      (err: unknown) => {
        console.warn("Background cloud task creation network warning:", err);
      }
    );

    return { ...newTask };
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    await this.init();
    const existing = this.memoryTasks.find((t) => t.id === id) || (await this.getTaskById(id));
    if (!existing) {
      throw new Error(`Task with id ${id} not found`);
    }

    const now = new Date().toISOString();
    let completedAt = existing.completedAt;
    if (input.isCompleted !== undefined) {
      completedAt = input.isCompleted ? (existing.completedAt || now) : undefined;
    }

    const updated: Task = {
      ...existing,
      ...input,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      notes: input.notes !== undefined ? input.notes.trim() || undefined : existing.notes,
      completedAt,
      updatedAt: now,
    };

    // 1. Instant local cache & memory update
    const nextTasks = this.memoryTasks.map((t) => (t.id === id ? updated : t));
    this.saveToLocalCache(nextTasks);

    // 2. Asynchronous cloud sync in background
    const row = this.mapTaskToRow(updated);
    void Promise.resolve(
      supabase
        .from("tasks")
        .update(row)
        .eq("id", id)
        .eq("user_id", this.userId)
    ).then(
      ({ error }) => {
        if (error) console.warn("Background cloud task update warning:", error.message);
      },
      (err: unknown) => {
        console.warn("Background cloud task update network warning:", err);
      }
    );

    return { ...updated };
  }

  async toggleTask(id: string): Promise<Task> {
    await this.init();
    const existing = this.memoryTasks.find((t) => t.id === id) || (await this.getTaskById(id));
    if (!existing) {
      throw new Error(`Task with id ${id} not found`);
    }

    return this.updateTask(id, {
      isCompleted: !existing.isCompleted,
    });
  }

  async deleteTask(id: string): Promise<void> {
    await this.init();

    // 1. Instant local removal
    const nextTasks = this.memoryTasks.filter((t) => t.id !== id);
    this.saveToLocalCache(nextTasks);

    // 2. Asynchronous cloud deletion in background
    void Promise.resolve(
      supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("user_id", this.userId)
    ).then(
      ({ error }) => {
        if (error) console.warn("Background cloud task deletion warning:", error.message);
      },
      (err: unknown) => {
        console.warn("Background cloud task deletion network warning:", err);
      }
    );
  }

  async reorderTasks(orderedIds: string[]): Promise<void> {
    await this.init();
    const idMap = new Map<string, number>();
    orderedIds.forEach((id, index) => idMap.set(id, index));

    const updatedTasks = this.memoryTasks.map((task) => {
      if (idMap.has(task.id)) {
        return { ...task, sortOrder: idMap.get(task.id)! };
      }
      return task;
    });

    this.saveToLocalCache(updatedTasks);

    // Update in Supabase in parallel batches
    const updatePromises = orderedIds.map((id, index) =>
      supabase
        .from("tasks")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", this.userId)
    );

    const results = await Promise.allSettled(updatePromises);
    const rejected = results.find((r) => r.status === "rejected");
    if (rejected && rejected.status === "rejected") {
      console.warn("Some task sort orders could not be saved to cloud:", rejected.reason);
    }
  }

  /**
   * Idempotent batch upsert for initial local task migration.
   */
  async importTasksBatch(tasks: Task[]): Promise<{ importedCount: number }> {
    await this.init();
    if (tasks.length === 0) return { importedCount: 0 };

    const rows: DbTaskRow[] = tasks.map((task) => this.mapTaskToRow(task));

    const { error } = await supabase.from("tasks").upsert(rows, { onConflict: "id" });

    if (error) {
      throw new Error(`Task import failed: ${error.message}`);
    }

    // Verify imported records
    const taskIds = tasks.map((t) => t.id);
    const { data: verified, error: verifyErr } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", this.userId)
      .in("id", taskIds);

    if (verifyErr || !verified || verified.length !== tasks.length) {
      throw new Error(
        `Import verification failed. Expected ${tasks.length} records, found ${
          verified?.length || 0
        }`
      );
    }

    // Merge into local cache
    const mergedMap = new Map<string, Task>();
    this.memoryTasks.forEach((t) => mergedMap.set(t.id, t));
    tasks.forEach((t) => mergedMap.set(t.id, t));
    const mergedList = Array.from(mergedMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
    this.saveToLocalCache(mergedList);

    return { importedCount: verified.length };
  }

  /**
   * Clear in-memory cached state on sign out.
   */
  clearMemory(): void {
    this.memoryTasks = [];
    this.isInitialized = false;
  }
}
