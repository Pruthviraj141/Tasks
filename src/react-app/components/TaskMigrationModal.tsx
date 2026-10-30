import React, { useState, useEffect } from "react";
import { Cloud, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getLocalTaskRepository, getTaskRepository } from "../storage";
import { SupabaseTaskRepository } from "../storage/SupabaseTaskRepository";
import type { Task } from "../types/task";

interface TaskMigrationModalProps {
  onMigrationComplete?: () => void;
}

export const TaskMigrationModal: React.FC<TaskMigrationModalProps> = ({
  onMigrationComplete,
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      return;
    }

    const migrationKey = `daymark_migrated_${user.id}`;
    const alreadyMigrated = localStorage.getItem(migrationKey);
    if (alreadyMigrated) {
      return;
    }

    let isSubscribed = true;

    async function checkLocalTasks() {
      try {
        const localRepo = getLocalTaskRepository();
        const tasks = await localRepo.getTasks();

        if (!isSubscribed) return;

        if (tasks.length === 0) {
          // No local tasks to migrate, automatically mark completed
          localStorage.setItem(migrationKey, "completed");
          return;
        }

        setLocalTasks(tasks);
        setIsOpen(true);
      } catch (err) {
        console.warn("Failed to check local tasks for migration:", err);
      }
    }

    checkLocalTasks();

    return () => {
      isSubscribed = false;
    };
  }, [user]);

  if (!isOpen || !user || localTasks.length === 0) {
    return null;
  }

  const handleImport = async () => {
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const activeRepo = getTaskRepository();
      if (!(activeRepo instanceof SupabaseTaskRepository)) {
        throw new Error("Cloud repository is not active. Please re-authenticate.");
      }

      await activeRepo.importTasksBatch(localTasks);

      // Successfully verified and imported
      localStorage.setItem(`daymark_migrated_${user.id}`, "completed");
      setIsOpen(false);

      if (onMigrationComplete) {
        onMigrationComplete();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import tasks to cloud.";
      setErrorMessage(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSkip = () => {
    if (user) {
      localStorage.setItem(`daymark_migrated_${user.id}`, "skipped");
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-card-foreground">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Sync Local Tasks to Cloud
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Found {localTasks.length} offline task{localTasks.length > 1 ? "s" : ""} on this
              device.
            </p>
          </div>
        </div>

        {/* Task List Preview */}
        <div className="bg-muted/40 rounded-2xl p-3 border border-border/40 max-h-48 overflow-y-auto space-y-2">
          {localTasks.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2.5 text-xs text-foreground/90 py-1 border-b border-border/20 last:border-0"
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                  t.isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/40"
                }`}
              >
                {t.isCompleted && <CheckCircle2 className="w-2.5 h-2.5" />}
              </div>
              <span className={`truncate ${t.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                {t.title}
              </span>
            </div>
          ))}
          {localTasks.length > 5 && (
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              +{localTasks.length - 5} more tasks
            </p>
          )}
        </div>

        {/* Error notice if import fails */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/90 leading-relaxed">
          Your tasks will be safely backed up to your private Google account. Existing local tasks
          remain preserved.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isImporting}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
          >
            Skip for Now
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Import to Cloud
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
