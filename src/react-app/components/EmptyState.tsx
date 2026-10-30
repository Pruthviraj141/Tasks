import { CheckCircle2, Plus } from "lucide-react";
import type { TaskFilter } from "../types/task";
import { Button } from "./ui/button";

interface EmptyStateProps {
  filter: TaskFilter;
  onOpenCreate: () => void;
  completedCount?: number;
}

export const EmptyState = ({ filter, onOpenCreate, completedCount = 0 }: EmptyStateProps) => {
  const getMessage = () => {
    switch (filter) {
      case "today":
        if (completedCount > 0) {
          return {
            title: "All done for today! ✨",
            subtitle: `You've completed all ${completedCount} task${completedCount === 1 ? "" : "s"} for today. Great work!`,
            buttonLabel: "Create another task",
          };
        }
        return {
          title: "Clear for today",
          subtitle: "No tasks scheduled for today. Take a break or add a task.",
          buttonLabel: "Create a task for today",
        };
      case "tomorrow":
        if (completedCount > 0) {
          return {
            title: "All set for tomorrow! 🎯",
            subtitle: `All ${completedCount} task${completedCount === 1 ? "" : "s"} scheduled for tomorrow are completed.`,
            buttonLabel: "Plan another task",
          };
        }
        return {
          title: "Clear for tomorrow",
          subtitle: "No tasks scheduled for tomorrow yet. Plan ahead with ease.",
          buttonLabel: "Plan a task for tomorrow",
        };
      case "upcoming":
        return {
          title: "Nothing upcoming",
          subtitle: "You don't have future tasks scheduled yet.",
          buttonLabel: "Add an upcoming task",
        };
      case "completed":
        return {
          title: "No completed tasks yet",
          subtitle: "Complete your tasks today to build your streak and make your mark.",
          buttonLabel: "Create a task",
        };
      case "all":
      default:
        return {
          title: "No tasks yet",
          subtitle: "Keep your day focused and calm. Add your first task below.",
          buttonLabel: "Create your first task",
        };
    }
  };

  const { title, subtitle, buttonLabel } = getMessage();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center select-none">
      <div className="size-12 rounded-full bg-[#F4F3EE] dark:bg-[#1A1A22] flex items-center justify-center text-[#8E8C85] dark:text-[#8E8E9E] mb-3 border border-[#E8E6E0] dark:border-[#2A2A36] transition-colors">
        <CheckCircle2 className="size-6 stroke-[1.5]" />
      </div>

      <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] tracking-tight transition-colors">
        {title}
      </h3>
      <p className="text-xs text-[#71717A] dark:text-[#9494A0] max-w-xs mt-1 mb-5 leading-relaxed transition-colors">
        {subtitle}
      </p>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={onOpenCreate}
        className="rounded-xl bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF] dark:bg-[#6366F1]/15 dark:text-[#818CF8] dark:hover:bg-[#6366F1]/25 font-medium"
      >
        <Plus className="size-3.5" />
        {buttonLabel}
      </Button>
    </div>
  );
};
