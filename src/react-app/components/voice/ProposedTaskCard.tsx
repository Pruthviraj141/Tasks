import { useState } from "react";
import { Calendar, Clock, Flag, Trash2, Edit2, AlertCircle, Check, Bell } from "lucide-react";
import type { ProposedTask } from "../../../shared/types/voiceTask";
import { formatScheduledDate, formatDueDate, formatDuration } from "../../lib/dateUtils";

interface ProposedTaskCardProps {
  task: ProposedTask;
  index: number;
  onUpdate: (index: number, task: ProposedTask) => void;
  onRemove: (index: number) => void;
}

export const ProposedTaskCard = ({
  task,
  index,
  onUpdate,
  onRemove,
}: ProposedTaskCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDate, setEditDate] = useState(task.scheduledDate || "");
  const [editTime, setEditTime] = useState(task.scheduledTime || "");
  const [editDuration, setEditDuration] = useState<number | undefined>(task.durationMinutes || undefined);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || "");
  const [editDueTime, setEditDueTime] = useState(task.dueTime || "");
  const [editReminderDate, setEditReminderDate] = useState(task.reminderDate || "");
  const [editReminderTime, setEditReminderTime] = useState(task.reminderTime || "");

  const scheduledLabel = formatScheduledDate(task.scheduledDate || undefined, task.scheduledTime || undefined);
  const dueInfo = formatDueDate(task.dueDate || undefined);
  const durationLabel = formatDuration(task.durationMinutes || undefined);

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    onUpdate(index, {
      ...task,
      title: editTitle.trim(),
      scheduledDate: editDate || null,
      scheduledTime: editTime || null,
      durationMinutes: editDuration || null,
      dueDate: editDueDate || null,
      dueTime: editDueTime || null,
      reminderDate: editReminderDate || null,
      reminderTime: editReminderTime || null,
      clarifications: [], // Cleared once user edits manually
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-[#18181F] rounded-2xl border border-[#ECEAE4] dark:border-[#282833] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all">
      {!isEditing ? (
        <div className="space-y-2">
          {/* Title & Actions */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[14.5px] font-medium text-[#1C1C1E] dark:text-[#F4F4F6] leading-snug flex-1">
              {task.title}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1 text-[#8E8C85] dark:text-[#9D9DA8] hover:text-[#5E5CE6] dark:hover:text-[#9B99F8] hover:bg-[#F4F3EE] dark:hover:bg-[#252530] rounded-lg transition-colors"
                title="Edit proposal"
              >
                <Edit2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="p-1 text-[#8E8C85] dark:text-[#9D9DA8] hover:text-[#EF4444] dark:hover:text-[#F87171] hover:bg-[#FEE2E2]/60 dark:hover:bg-[#EF4444]/20 rounded-lg transition-colors"
                title="Discard task"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Notes if present */}
          {task.notes && (
            <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] leading-relaxed">
              {task.notes}
            </p>
          )}

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {scheduledLabel && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#F2F0EA] dark:bg-[#23232C] text-[#55534E] dark:text-[#C4C4CE] font-medium">
                <Calendar className="size-3 text-[#5E5CE6] dark:text-[#7C79F2]" />
                {scheduledLabel}
              </span>
            )}

            {durationLabel && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#F2F0EA] dark:bg-[#23232C] text-[#55534E] dark:text-[#C4C4CE] font-medium">
                <Clock className="size-3 text-[#5E5CE6] dark:text-[#7C79F2]" />
                {durationLabel}
              </span>
            )}

            {dueInfo && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-[#2D2411] text-[#92400E] dark:text-[#FDE68A] font-medium">
                <Flag className="size-3" />
                {dueInfo.label}
                {task.dueTime ? ` at ${task.dueTime}` : ""}
              </span>
            )}

            {(task.reminderDate || task.reminderTime) && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#EEF2FF] dark:bg-[#1E1E33] text-[#4F46E5] dark:text-[#A5B4FC] font-medium">
                <Bell className="size-3 text-[#5E5CE6] dark:text-[#7C79F2]" />
                Reminder {task.reminderTime || ""} {task.reminderDate ? `(${task.reminderDate})` : ""}
              </span>
            )}
          </div>

          {/* Ambiguity / Clarification prompt with one-click resolution */}
          {task.clarifications && task.clarifications.length > 0 && (
            <div className="mt-2 p-2.5 bg-[#FEF3C7]/70 dark:bg-[#2C2310]/80 border border-[#FDE68A] dark:border-[#4D3D1A] rounded-xl text-xs text-[#92400E] dark:text-[#FDE68A]">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  {task.clarifications.map((msg, i) => {
                    const isAmPmQuestion = /am\s*(?:or|\/)\s*pm/i.test(msg) || /\b(?:1[0-2]|[1-9])\b/i.test(msg);
                    const hourMatch = msg.match(/\b(1[0-2]|[1-9])\b/);
                    const hourNum = hourMatch ? parseInt(hourMatch[1], 10) : 10;
                    return (
                      <div key={i}>
                        <p>{msg}</p>
                        {isAmPmQuestion && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] font-medium text-[#78350F] dark:text-[#FDE68A]">Select time:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const h24 = String(hourNum % 12).padStart(2, "0") + ":00";
                                onUpdate(index, {
                                  ...task,
                                  scheduledTime: h24,
                                  clarifications: [],
                                });
                              }}
                              className="px-2.5 py-1 bg-white dark:bg-[#1B1B24] hover:bg-[#FEF3C7] dark:hover:bg-[#342A14] text-[#92400E] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#52411E] rounded-lg font-semibold text-[11px] shadow-2xs transition-all active:scale-95"
                            >
                              {hourNum}:00 AM
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const h24 = String((hourNum % 12) + 12).padStart(2, "0") + ":00";
                                onUpdate(index, {
                                  ...task,
                                  scheduledTime: h24,
                                  clarifications: [],
                                });
                              }}
                              className="px-2.5 py-1 bg-white dark:bg-[#1B1B24] hover:bg-[#FEF3C7] dark:hover:bg-[#342A14] text-[#92400E] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#52411E] rounded-lg font-semibold text-[11px] shadow-2xs transition-all active:scale-95"
                            >
                              {hourNum}:00 PM
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-[11px] font-semibold underline shrink-0 hover:text-[#B45309] dark:hover:text-[#FDE68A]"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Inline editing form */
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-sm font-medium text-[#1C1C1E] dark:text-[#F4F4F6] bg-[#F4F3EE] dark:bg-[#111116] rounded-lg px-2.5 py-1.5 outline-none border border-[#E8E6E0] dark:border-[#2D2D38] focus:border-[#5E5CE6] dark:focus:border-[#7C79F2]"
            placeholder="Task title"
          />

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10.5px] text-[#71717A] dark:text-[#9D9DA8] uppercase font-semibold">Start Date</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full bg-[#F4F3EE] dark:bg-[#111116] text-[#55534E] dark:text-[#E2E2E8] rounded-lg px-2 py-1 border border-[#E8E6E0] dark:border-[#2D2D38] outline-none"
              />
            </div>
            <div>
              <label className="text-[10.5px] text-[#71717A] dark:text-[#9D9DA8] uppercase font-semibold">Start Time</label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full bg-[#F4F3EE] dark:bg-[#111116] text-[#55534E] dark:text-[#E2E2E8] rounded-lg px-2 py-1 border border-[#E8E6E0] dark:border-[#2D2D38] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-[10.5px] text-[#71717A] dark:text-[#9D9DA8] uppercase font-semibold">Duration (min)</label>
              <input
                type="number"
                value={editDuration || ""}
                onChange={(e) => setEditDuration(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 60"
                className="w-full bg-[#F4F3EE] dark:bg-[#111116] text-[#55534E] dark:text-[#E2E2E8] rounded-lg px-2 py-1 border border-[#E8E6E0] dark:border-[#2D2D38] outline-none"
              />
            </div>
            <div>
              <label className="text-[10.5px] text-[#71717A] dark:text-[#9D9DA8] uppercase font-semibold">Due Date</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full bg-[#F4F3EE] dark:bg-[#111116] text-[#55534E] dark:text-[#E2E2E8] rounded-lg px-2 py-1 border border-[#E8E6E0] dark:border-[#2D2D38] outline-none"
              />
            </div>
            <div>
              <label className="text-[10.5px] text-[#71717A] dark:text-[#9D9DA8] uppercase font-semibold">Due Time</label>
              <input
                type="time"
                value={editDueTime}
                onChange={(e) => setEditDueTime(e.target.value)}
                className="w-full bg-[#F4F3EE] dark:bg-[#111116] text-[#55534E] dark:text-[#E2E2E8] rounded-lg px-2 py-1 border border-[#E8E6E0] dark:border-[#2D2D38] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10.5px] text-[#71717A] dark:text-[#9D9DA8] uppercase font-semibold">Reminder Date</label>
              <input
                type="date"
                value={editReminderDate}
                onChange={(e) => setEditReminderDate(e.target.value)}
                className="w-full bg-[#F4F3EE] dark:bg-[#111116] text-[#55534E] dark:text-[#E2E2E8] rounded-lg px-2 py-1 border border-[#E8E6E0] dark:border-[#2D2D38] outline-none"
              />
            </div>
            <div>
              <label className="text-[10.5px] text-[#71717A] dark:text-[#9D9DA8] uppercase font-semibold">Reminder Time</label>
              <input
                type="time"
                value={editReminderTime}
                onChange={(e) => setEditReminderTime(e.target.value)}
                className="w-full bg-[#F4F3EE] dark:bg-[#111116] text-[#55534E] dark:text-[#E2E2E8] rounded-lg px-2 py-1 border border-[#E8E6E0] dark:border-[#2D2D38] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F2F0EB] dark:border-[#24242E]">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-[#71717A] dark:text-[#9D9DA8] hover:bg-[#F4F3EE] dark:hover:bg-[#22222A] px-2.5 py-1 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="text-xs text-white bg-[#5E5CE6] hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:hover:bg-[#6865E8] font-semibold px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm"
            >
              <Check className="size-3" />
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
