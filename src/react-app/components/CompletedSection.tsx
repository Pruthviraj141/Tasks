import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Task } from "../types/task";
import { TaskItem } from "./TaskItem";
import { cn } from "cn";

interface CompletedSectionProps {
  completedTasks: Task[];
  onToggle: (id: string) => void;
  onClick: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const CompletedSection = ({
  completedTasks,
  onToggle,
  onClick,
  onDelete,
}: CompletedSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (completedTasks.length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-[#ECEAE4]/80 dark:border-[#26262F] transition-colors">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-[#71717A] dark:text-[#9494A0] hover:text-[#1C1C1E] dark:hover:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg select-none cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <ChevronRight
            className={cn(
              "size-3.5 text-[#A1A1AA] dark:text-[#686874] transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
          Completed ({completedTasks.length})
        </span>
        <span className="text-[11px] text-[#A1A1AA] dark:text-[#686874]">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-2.5 space-y-2">
          {completedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onClick={onClick}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
