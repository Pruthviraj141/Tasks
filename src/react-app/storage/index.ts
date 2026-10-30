import { Capacitor } from "@capacitor/core";
import type { TaskRepository } from "./TaskRepository";
import { WebTaskRepository } from "./WebTaskRepository";
import { SQLiteTaskRepository } from "./SQLiteTaskRepository";
import { SupabaseTaskRepository } from "./SupabaseTaskRepository";

let localRepositoryInstance: TaskRepository | null = null;
let currentRepositoryInstance: TaskRepository | null = null;
let currentAuthenticatedUserId: string | null = null;

export function getLocalTaskRepository(): TaskRepository {
  if (localRepositoryInstance) {
    return localRepositoryInstance;
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      localRepositoryInstance = new SQLiteTaskRepository();
    } catch (e) {
      console.warn("SQLite repository failed to instantiate, falling back to Web storage", e);
      localRepositoryInstance = new WebTaskRepository();
    }
  } else {
    localRepositoryInstance = new WebTaskRepository();
  }

  return localRepositoryInstance;
}

export function setAuthenticatedUser(userId: string | null): TaskRepository {
  if (userId) {
    currentAuthenticatedUserId = userId;
    currentRepositoryInstance = new SupabaseTaskRepository(userId);
  } else {
    if (currentRepositoryInstance instanceof SupabaseTaskRepository) {
      currentRepositoryInstance.clearMemory();
    }
    currentAuthenticatedUserId = null;
    currentRepositoryInstance = getLocalTaskRepository();
  }
  return currentRepositoryInstance;
}

export function getTaskRepository(): TaskRepository {
  if (currentRepositoryInstance) {
    return currentRepositoryInstance;
  }

  if (currentAuthenticatedUserId) {
    currentRepositoryInstance = new SupabaseTaskRepository(currentAuthenticatedUserId);
    return currentRepositoryInstance;
  }

  currentRepositoryInstance = getLocalTaskRepository();
  return currentRepositoryInstance;
}

