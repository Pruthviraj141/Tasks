import type { Task, CreateTaskInput, UpdateTaskInput } from "../types/task";

export interface TaskRepository {
  init(): Promise<void>;
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;
  toggleTask(id: string): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  reorderTasks(orderedIds: string[]): Promise<void>;
}
