import { Capacitor } from "@capacitor/core";
import type { TaskRepository } from "./TaskRepository";
import { WebTaskRepository } from "./WebTaskRepository";
import { SQLiteTaskRepository } from "./SQLiteTaskRepository";

let repositoryInstance: TaskRepository | null = null;

export function getTaskRepository(): TaskRepository {
  if (repositoryInstance) {
    return repositoryInstance;
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      repositoryInstance = new SQLiteTaskRepository();
    } catch (e) {
      console.warn("SQLite repository failed to instantiate, falling back to Web storage", e);
      repositoryInstance = new WebTaskRepository();
    }
  } else {
    repositoryInstance = new WebTaskRepository();
  }

  return repositoryInstance;
}
