import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import type { Task } from "../types/task";
import { TaskItem } from "./TaskItem";
import { Button } from "./ui/button";
import { cn } from "cn";

interface CompletedSectionProps {
  completedTasks: Task[];
  defaultOpen?: boolean;
  onToggle: (id: string) => void;
  onClick: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdateTitle?: (id: string, newTitle: string) => Promise<void>;
}

export const CompletedSection = ({
  completedTasks,
  defaultOpen = false,
  onToggle,
  onClick,
  onDelete,
  onUpdateTitle,
}: CompletedSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const shouldReduceMotion = useReducedMotion();

  if (completedTasks.length === 0) return null;

  return (
    <div className="mt-5 pt-3 border-t border-[#ECE9E0] dark:border-[#222227] transition-colors">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="h-auto w-full justify-between rounded-lg px-2 py-1 text-xs font-medium text-[#71717A] hover:bg-black/5 hover:text-[#18181B] dark:text-[#8E8E9A] dark:hover:bg-white/5 dark:hover:text-[#F4F4F6]"
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
      </Button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border border-[#E6E4DC] dark:border-[#242429] bg-white/70 dark:bg-[#151518]/70 overflow-hidden divide-y divide-[#F0ECE3] dark:divide-[#202026] shadow-2xs">
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onClick={onClick}
                  onDelete={onDelete}
                  onUpdateTitle={onUpdateTitle}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
