import React from "react";
import { format } from "date-fns";
import type { TaskFilter } from "../types/task";
import { cn } from "cn";

interface HeaderProps {
  totalCount: number;
  completedCount: number;
  progressPercentage: number;
  activeFilter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  counts: {
    all: number;
    today: number;
    upcoming: number;
    completed: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  completedCount,
  progressPercentage,
  activeFilter,
  onFilterChange,
  counts,
}) => {
  const currentDate = format(new Date(), "EEEE, MMMM d");

  return (
    <header className="px-5 pt-7 pb-4">
      {/* Date */}
      <p className="text-[12.5px] font-medium tracking-wide uppercase text-[#8E8C85]">
        {currentDate}
      </p>

      {/* Main Title & Progress */}
      <div className="flex items-baseline justify-between mt-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1E]">
          My Tasks
        </h1>

        {totalCount > 0 && (
          <span className="text-xs font-medium text-[#71717A]">
            {completedCount} of {totalCount} completed
          </span>
        )}
      </div>

      {/* Subtle Micro Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full h-1 bg-[#ECEAE4] rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-[#5E5CE6] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Filter Tabs / Segmented Control */}
      <div className="flex items-center gap-1.5 mt-4 p-1 bg-[#F2F0EB] rounded-xl overflow-x-auto no-scrollbar">
        {(
          [
            { id: "all", label: "All", count: counts.all },
            { id: "today", label: "Today", count: counts.today },
            { id: "upcoming", label: "Upcoming", count: counts.upcoming },
          ] as const
        ).map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all select-none whitespace-nowrap",
                isActive
                  ? "bg-white text-[#1C1C1E] shadow-sm font-semibold"
                  : "text-[#71717A] hover:text-[#1C1C1E] hover:bg-white/50"
              )}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={cn(
                    "text-[10.5px] px-1.5 py-0.2 rounded-full",
                    isActive
                      ? "bg-[#F4F3EE] text-[#55534E]"
                      : "bg-[#E8E6E0] text-[#71717A]"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
