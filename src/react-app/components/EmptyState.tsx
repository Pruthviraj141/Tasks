import React from "react";
import { CheckCircle2, Plus } from "lucide-react";

interface EmptyStateProps {
  filter: string;
  onOpenCreate: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ filter, onOpenCreate }) => {
  const getMessage = () => {
    switch (filter) {
      case "today":
        return {
          title: "Clear for today",
          subtitle: "No tasks scheduled for today. Take a break or add a task.",
        };
      case "upcoming":
        return {
          title: "Nothing upcoming",
          subtitle: "You don't have future tasks scheduled yet.",
        };
      default:
        return {
          title: "No tasks yet",
          subtitle: "Keep your day focused and calm. Add your first task below.",
        };
    }
  };

  const { title, subtitle } = getMessage();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center select-none">
      <div className="size-12 rounded-full bg-[#F4F3EE] flex items-center justify-center text-[#8E8C85] mb-3 border border-[#E8E6E0]">
        <CheckCircle2 className="size-6 stroke-[1.5]" />
      </div>

      <h3 className="text-base font-semibold text-[#1C1C1E] tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-[#71717A] max-w-xs mt-1 mb-5 leading-relaxed">
        {subtitle}
      </p>

      <button
        type="button"
        onClick={onOpenCreate}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#5E5CE6] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-xl transition-colors"
      >
        <Plus className="size-3.5" />
        Create a task
      </button>
    </div>
  );
};
