import type { Task, CreateTaskInput, UpdateTaskInput } from "../types/task";
import type { TaskRepository } from "./TaskRepository";

const STORAGE_KEY = "daymark_tasks_v1";

const INITIAL_TASKS: Task[] = [
  {
    id: "init-1",
    title: "Review Daymark design principles & typography",
    notes: "Ensure generous whitespace, warm off-white tones, and smooth transitions.",
    isCompleted: false,
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "09:30",
    durationMinutes: 30,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    sortOrder: 1,
  },
  {
    id: "init-2",
    title: "Draft weekly project sprint goals",
    notes: "Focus on core user experience and offline reliability.",
    isCompleted: false,
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "11:00",
    durationMinutes: 45,
    dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    sortOrder: 2,
  },
  {
    id: "init-3",
    title: "Walk outside & disconnect for 20 minutes",
    isCompleted: false,
    scheduledDate: new Date().toISOString().split("T")[0],
    durationMinutes: 20,
    createdAt: new Date(Date.now() - 900000).toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString(),
    sortOrder: 3,
  },
  {
    id: "init-4",
    title: "Install mobile dependencies & verify SQLite setup",
    notes: "Capacitor SQLite and local storage verified.",
    isCompleted: true,
    completedAt: new Date(Date.now() - 600000).toISOString(),
    scheduledDate: new Date().toISOString().split("T")[0],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
    sortOrder: 4,
  },
];

export class WebTaskRepository implements TaskRepository {
  private tasks: Task[] = [];
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.tasks = JSON.parse(raw);
      } else {
        this.tasks = [...INITIAL_TASKS];
        this.save();
      }
    } catch (e) {
      console.warn("Failed to read tasks from localStorage, fallback to default", e);
      this.tasks = [...INITIAL_TASKS];
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

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    await this.init();
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Task with id ${id} not found`);
    }

    const current = this.tasks[index];
    const now = new Date().toISOString();

    let completedAt = current.completedAt;
    if (input.isCompleted !== undefined) {
      completedAt = input.isCompleted ? (current.completedAt || now) : undefined;
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
