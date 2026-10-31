import type { Task, CreateTaskInput, UpdateTaskInput } from "../types/task";
import type { TaskRepository } from "./TaskRepository";

const STORAGE_KEY = "daymark_tasks_v1";

export class WebTaskRepository implements TaskRepository {
  private tasks: Task[] = [];
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const CLEAN_SLATE_KEY = "daymark_clean_slate_v3";
      if (!localStorage.getItem(CLEAN_SLATE_KEY)) {
        // One-time purge of all legacy demo / mock tasks
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(CLEAN_SLATE_KEY, "true");
        this.tasks = [];
        this.initialized = true;
        return;
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Clean out any legacy mock tasks starting with "init-"
        this.tasks = Array.isArray(parsed)
          ? parsed.filter((t: Task) => t && t.id && !t.id.startsWith("init-"))
          : [];
        this.save();
      } else {
        this.tasks = [];
        this.save();
      }
    } catch (e) {
      console.warn("Failed to read tasks from localStorage, reset to empty", e);
      this.tasks = [];
      this.save();
    }
    this.initialized = true;
  }


  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks));
    } catch (e) {
      console.error("Failed to save tasks to localStorage", e);
    }
  }

  async getTasks(): Promise<Task[]> {
    await this.init();
    return [...this.tasks].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getTaskById(id: string): Promise<Task | null> {
    await this.init();
    const task = this.tasks.find((t) => t.id === id);
    return task ? { ...task } : null;
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    const now = new Date().toISOString();
    const nextSortOrder = this.tasks.length > 0 
      ? Math.min(...this.tasks.map((t) => t.sortOrder)) - 1 
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

    this.tasks.unshift(newTask);
    this.save();
    return { ...newTask };
  }

  async createTasks(inputs: CreateTaskInput[]): Promise<Task[]> {
    if (inputs.length === 0) return [];
    await this.init();
    const now = new Date().toISOString();
    let currentMinSort =
      this.tasks.length > 0
        ? Math.min(...this.tasks.map((t) => t.sortOrder))
        : 0;

    const newTasks: Task[] = inputs.map((input, idx) => {
      currentMinSort -= 1;
      return {
        id: "task-" + Date.now() + "-" + idx + "-" + Math.random().toString(36).substring(2, 7),
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
        sortOrder: currentMinSort,
      };
    });

    this.tasks.unshift(...newTasks);
    this.save();
    return newTasks;
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    await this.init();
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Task with id ${id} not found`);
    }

    const current = this.tasks[index];
    const now = new Date().toISOString();

    let completedAt: string | undefined = current.completedAt;
    if (input.isCompleted !== undefined) {
      completedAt = input.isCompleted ? now : undefined;
    }

    const updated: Task = {
      ...current,
      ...input,
      title: input.title !== undefined ? input.title.trim() : current.title,
      notes: input.notes !== undefined ? (input.notes.trim() || undefined) : current.notes,
      completedAt,
      updatedAt: now,
    };

    this.tasks[index] = updated;
    this.save();
    return { ...updated };
  }

  async toggleTask(id: string): Promise<Task> {
    await this.init();
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Task with id ${id} not found`);
    }

    const current = this.tasks[index];
    const willBeCompleted = !current.isCompleted;
    const now = new Date().toISOString();

    const updated: Task = {
      ...current,
      isCompleted: willBeCompleted,
      completedAt: willBeCompleted ? now : undefined,
      updatedAt: now,
    };

    this.tasks[index] = updated;
    this.save();
    return { ...updated };
  }

  async deleteTask(id: string): Promise<void> {
    await this.init();
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.save();
  }

  async reorderTasks(orderedIds: string[]): Promise<void> {
    await this.init();
    const idMap = new Map<string, number>();
    orderedIds.forEach((id, index) => idMap.set(id, index));

    this.tasks.forEach((task) => {
      if (idMap.has(task.id)) {
        task.sortOrder = idMap.get(task.id)!;
      }
    });

    this.save();
  }
}
