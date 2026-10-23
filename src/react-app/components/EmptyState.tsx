import { CheckCircle2, Plus } from "lucide-react";

interface EmptyStateProps {
  filter: string;
  onOpenCreate: () => void;
}

export const EmptyState = ({ filter, onOpenCreate }: EmptyStateProps) => {
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
      <div className="size-12 rounded-full bg-[#F4F3EE] dark:bg-[#1A1A22] flex items-center justify-center text-[#8E8C85] dark:text-[#8E8E9E] mb-3 border border-[#E8E6E0] dark:border-[#2A2A36] transition-colors">
        <CheckCircle2 className="size-6 stroke-[1.5]" />
      </div>

      <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] tracking-tight transition-colors">
        {title}
      </h3>
      <p className="text-xs text-[#71717A] dark:text-[#9494A0] max-w-xs mt-1 mb-5 leading-relaxed transition-colors">
        {subtitle}
      </p>

      <button
        type="button"
        onClick={onOpenCreate}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#5E5CE6] dark:text-[#9D9AF8] bg-[#EEF2FF] dark:bg-[#7C79F2]/15 hover:bg-[#E0E7FF] dark:hover:bg-[#7C79F2]/25 rounded-xl transition-colors cursor-pointer"
      >
        <Plus className="size-3.5" />
        Create a task
      </button>
    </div>
  );
};
