import { useState, useEffect, useCallback, useMemo } from "react";
import type { Task, CreateTaskInput, UpdateTaskInput } from "../types/task";
import { getTaskRepository } from "../storage";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => getTaskRepository(), []);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const items = await repository.getTasks();
      setTasks(items);
    } catch (err) {
      console.error("Error loading tasks", err);
      setError("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      try {
        const created = await repository.createTask(input);
        setTasks((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        console.error("Failed to create task", err);
        setError("Failed to add task");
        throw err;
      }
    },
    [repository]
  );

  const updateTask = useCallback(
    async (id: string, input: UpdateTaskInput) => {
      try {
        const updated = await repository.updateTask(id, input);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        return updated;
      } catch (err) {
        console.error("Failed to update task", err);
        setError("Failed to update task");
        throw err;
      }
    },
    [repository]
  );

  const toggleTask = useCallback(
    async (id: string) => {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const willBeCompleted = !t.isCompleted;
            return {
              ...t,
              isCompleted: willBeCompleted,
              completedAt: willBeCompleted ? new Date().toISOString() : undefined,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );

      try {
        const updated = await repository.toggleTask(id);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        return updated;
      } catch (err) {
        console.error("Failed to toggle task, rolling back", err);
        await loadTasks();
        throw err;
      }
    },
    [repository, loadTasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      // Optimistic delete
      setTasks((prev) => prev.filter((t) => t.id !== id));
      try {
        await repository.deleteTask(id);
      } catch (err) {
        console.error("Failed to delete task, rolling back", err);
        await loadTasks();
        throw err;
      }
    },
    [repository, loadTasks]
  );

  const reorderTasks = useCallback(
    async (orderedIds: string[]) => {
      const idMap = new Map<string, number>();
      orderedIds.forEach((id, idx) => idMap.set(id, idx));

      setTasks((prev) =>
        [...prev].sort((a, b) => {
          const orderA = idMap.has(a.id) ? idMap.get(a.id)! : a.sortOrder;
          const orderB = idMap.has(b.id) ? idMap.get(b.id)! : b.sortOrder;
          return orderA - orderB;
        })
      );

      try {
        await repository.reorderTasks(orderedIds);
      } catch (err) {
        console.error("Failed to persist task reorder", err);
      }
    },
    [repository]
  );

  const activeTasks = useMemo(() => tasks.filter((t) => !t.isCompleted), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.isCompleted), [tasks]);

  const totalCount = tasks.length;
  const completedCount = completedTasks.length;
  const progressPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    tasks,
    activeTasks,
    completedTasks,
    isLoading,
    error,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    reorderTasks,
    refresh: loadTasks,
    totalCount,
    completedCount,
    progressPercentage,
  };
}
