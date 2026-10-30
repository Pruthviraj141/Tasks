import { useState, useRef, useEffect, type MouseEvent, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Calendar, Clock, Flag, AlignLeft, Trash2, Play, AlertTriangle, Edit2, Check, X } from "lucide-react";
import type { Task } from "../types/task";
import { CircularCheckbox } from "./CircularCheckbox";
import { formatScheduledDate, formatDueDate, formatDuration, isTaskOverdue, getTodayISODate } from "../lib/dateUtils";
import { Button } from "./ui/button";
import { haptics } from "../lib/haptics";
import { cn } from "cn";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onClick: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartFocus?: (task: Task) => void;
  onUpdateTitle?: (id: string, newTitle: string) => Promise<void>;
}

export const TaskItem = ({
  task,
  onToggle,
  onClick,
  onDelete,
  onStartFocus,
  onUpdateTitle,
}: TaskItemProps) => {
  const shouldReduceMotion = useReducedMotion();
  const scheduledLabel = formatScheduledDate(task.scheduledDate, task.scheduledTime);
  const dueInfo = formatDueDate(task.dueDate);
  const durationLabel = formatDuration(task.durationMinutes);
  const overdue = isTaskOverdue(task, getTodayISODate());

  // Inline title editing state
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Swipe-to-complete state
  const [dragDistance, setDragDistance] = useState(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setEditedTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (isEditingInline && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingInline]);

  const handleStartInlineEdit = (e: MouseEvent) => {
    e.stopPropagation();
    setIsEditingInline(true);
  };

  const handleSaveInlineEdit = async (e?: MouseEvent) => {
    if (e) e.stopPropagation();
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== task.title && onUpdateTitle) {
      await onUpdateTitle(task.id, trimmed);
    } else {
      setEditedTitle(task.title);
    }
    setIsEditingInline(false);
  };

  const handleCancelInlineEdit = (e: MouseEvent) => {
    e.stopPropagation();
    setEditedTitle(task.title);
    setIsEditingInline(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveInlineEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditedTitle(task.title);
      setIsEditingInline(false);
    }
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    onDelete(task.id);
  };

  return (
    <div className="relative overflow-hidden group select-none">
      {/* Background Swipe Reveal Indicator (Complete) */}
      {!task.isCompleted && !isEditingInline && (
        <div
          className={cn(
            "absolute inset-0 flex items-center pl-4.5 pointer-events-none transition-colors duration-180",
            dragDistance >= 70
              ? "bg-emerald-500/20 dark:bg-emerald-500/25"
              : "bg-emerald-500/10 dark:bg-emerald-500/10"
          )}
        >
          <motion.div
            style={{
              opacity: Math.min(1, Math.max(0, (dragDistance - 10) / 45)),
              scale: Math.min(1.15, Math.max(0.75, 0.75 + dragDistance / 140)),
            }}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              dragDistance >= 70
                ? "text-emerald-700 dark:text-emerald-300 font-semibold"
                : "text-emerald-600/80 dark:text-emerald-400/80"
            )}
          >
            <div className="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
              <Check className="size-3 stroke-[2.5]" />
            </div>
            <span className="text-[11px] tracking-tight">Complete</span>
          </motion.div>
        </div>
      )}

      {/* Front Draggable Task Row */}
      <motion.div
        layout="position"
        drag={task.isCompleted || isEditingInline || shouldReduceMotion ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.38 }}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDrag={(_, info) => {
          setDragDistance(Math.max(0, info.offset.x));
        }}
        onDragEnd={(_, info) => {
          const x = info.offset.x;
          const y = Math.abs(info.offset.y);
          setDragDistance(0);

          // Threshold check: Must drag horizontally > 70px without major vertical movement
          if (x >= 70 && y < 35 && !task.isCompleted) {
            haptics.taskCompleted().catch(() => {});
            onToggle(task.id);
          }

          // Delay clearing dragging flag to avoid triggering onClick immediately
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 80);
        }}
        onClick={() => {
          if (!isDraggingRef.current && !isEditingInline) {
            onClick(task);
          }
        }}
        className={cn(
          "relative flex items-start gap-3 px-4 py-3 sm:py-3.5 cursor-pointer bg-white dark:bg-[#151518] transition-colors duration-150",
          "hover:bg-[#F9F8F4] active:bg-[#F3F1EA] dark:hover:bg-[#1A1A1E] dark:active:bg-[#131316]",
          task.isCompleted && "opacity-60 hover:opacity-85",
          overdue && !task.isCompleted && "bg-[#FEF2F2]/40 dark:bg-[#281313]/30"
        )}
      >
        {/* Circular Checkbox */}
        <div className="pt-0.5 shrink-0">
          <CircularCheckbox
            checked={task.isCompleted}
            onToggle={() => onToggle(task.id)}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-start justify-between gap-2">
            {isEditingInline ? (
              <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={inputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 text-[14.5px] font-medium bg-white dark:bg-[#1E1E24] text-[#18181B] dark:text-[#F4F4F6] px-2 py-0.5 rounded-lg border border-[#4F46E5] dark:border-[#6366F1] outline-none shadow-2xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleSaveInlineEdit}
                  title="Save title"
                  className="text-[#10B981] hover:bg-[#10B981]/15"
                >
                  <Check className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCancelInlineEdit}
                  title="Cancel"
                  className="text-[#71717A] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="relative inline-block max-w-full">
                <p
                  onDoubleClick={handleStartInlineEdit}
                  className={cn(
                    "text-[14.5px] leading-snug font-normal transition-colors duration-200 select-none",
                    task.isCompleted
                      ? "text-[#71717A] dark:text-[#8E8E9A]"
                      : "text-[#18181B] dark:text-[#F4F4F6]"
                  )}
                >
                  {task.title}
                </p>

                {/* Smooth Animated Title Strike-through */}
                <motion.span
                  initial={false}
                  animate={{
                    scaleX: task.isCompleted ? 1 : 0,
                    opacity: task.isCompleted ? 0.8 : 0,
                  }}
                  transition={{
                    duration: shouldReduceMotion ? 0.05 : 0.24,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute left-0 top-[52%] w-full h-[1.5px] bg-[#71717A] dark:bg-[#8E8E9A] origin-left pointer-events-none rounded-full"
                />
              </div>
            )}

            {/* Quick Action Buttons */}
            {!isEditingInline && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                {onUpdateTitle && !task.isCompleted && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleStartInlineEdit}
                    aria-label="Edit title inline"
                    title="Edit title inline"
                    className="text-[#71717A] hover:bg-[#EDEAE2] hover:text-[#18181B] dark:text-[#8E8E9A] dark:hover:bg-[#26262D] dark:hover:text-[#F4F4F6]"
                  >
                    <Edit2 className="size-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleDelete}
                  aria-label="Delete task"
                  title="Delete task"
                  className="text-[#9CA3AF] hover:bg-[#FEE2E2] hover:text-[#EF4444] dark:text-[#71717A] dark:hover:bg-[#EF4444]/15 dark:hover:text-[#F87171]"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Notes Snippet */}
          {task.notes && !task.isCompleted && !isEditingInline && (
            <p className="mt-0.5 text-[12.5px] text-[#71717A] dark:text-[#8E8E9A] line-clamp-1 flex items-center gap-1 font-normal">
              <AlignLeft className="size-3 shrink-0 text-[#A1A1AA] dark:text-[#686874]" />
              <span className="truncate">{task.notes}</span>
            </p>
          )}

          {/* Metadata Badges */}
          {(scheduledLabel || dueInfo || durationLabel || overdue) && !isEditingInline && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {overdue && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium bg-[#FEE2E2] text-[#B91C1C] dark:bg-[#3D1414] dark:text-[#FCA5A5]">
                  <AlertTriangle className="size-3" />
                  Overdue
                </span>
              )}

              {scheduledLabel && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium tracking-tight",
                    task.isCompleted
                      ? "bg-[#EFECE6]/60 text-[#8C8982] dark:bg-[#1E1E26] dark:text-[#686874]"
                      : "bg-[#EFECE5] text-[#55534E] dark:bg-[#202026] dark:text-[#A1A1AA]"
                  )}
                >
                  <Calendar className="size-3 opacity-75 text-[#4F46E5] dark:text-[#818CF8]" />
                  {scheduledLabel}
                </span>
              )}

              {durationLabel && (
                <span
                  onClick={(e: MouseEvent) => {
                    if (onStartFocus && !task.isCompleted) {
                      e.stopPropagation();
                      onStartFocus(task);
                    }
                  }}
                  title={!task.isCompleted ? "Start Focus session" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium tracking-tight",
                    task.isCompleted
                      ? "bg-[#EFECE6]/60 text-[#8C8982] dark:bg-[#1E1E26] dark:text-[#686874]"
                      : "cursor-pointer bg-[#EFECE5] text-[#55534E] hover:bg-[#E2DFD6] hover:text-[#4F46E5] dark:bg-[#202026] dark:text-[#A1A1AA] dark:hover:bg-[#26262E] dark:hover:text-[#818CF8]"
                  )}
                >
                  <Clock className="size-3 opacity-75 text-[#4F46E5] dark:text-[#818CF8]" />
                  {durationLabel}
                  {!task.isCompleted && (
                    <Play className="size-2 fill-current ml-0.5 text-[#4F46E5] dark:text-[#818CF8]" />
                  )}
                </span>
              )}

              {dueInfo && !overdue && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium tracking-tight",
                    task.isCompleted
                      ? "bg-[#EFECE6]/60 text-[#8C8982] dark:bg-[#1E1E26] dark:text-[#686874]"
                      : dueInfo.isOverdue
                      ? "bg-[#FEE2E2] text-[#B91C1C] dark:bg-[#3D1414] dark:text-[#FCA5A5]"
                      : "bg-[#FEF3C7] text-[#92400E] dark:bg-[#32230D] dark:text-[#FDE68A]"
                  )}
                >
                  <Flag className="size-3 opacity-80" />
                  {dueInfo.label}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
