export interface Task {
  id: string;
  title: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  durationMinutes?: number; // e.g. 15, 30, 45, 60
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  reminderDate?: string;
  reminderTime?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  sortOrder: number;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  dueDate?: string;
  dueTime?: string;
  reminderDate?: string;
  reminderTime?: string;
}

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  isCompleted?: boolean;
  completedAt?: string;
  sortOrder?: number;
};

export type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed';
