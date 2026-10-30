import { Bell, Check, X, ShieldAlert } from "lucide-react";
import { Drawer, DrawerContent } from "./ui/drawer";
import { Button } from "./ui/button";

interface NotificationOnboardingModalProps {
  isOpen: boolean;
  isDenied: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export const NotificationOnboardingModal = ({
  isOpen,
  isDenied,
  onEnable,
  onDismiss,
}: NotificationOnboardingModalProps) => {
  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onDismiss(); }} showSwipeHandle>
      <DrawerContent className="overflow-hidden border border-[#E8E6E0] bg-[#FAF9F6] p-6 text-center shadow-2xl dark:border-[#272732] dark:bg-[#141418]">
            {/* Top Close */}
            <div className="flex justify-end -mt-1 -mr-1 mb-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onDismiss}
                aria-label="Dismiss"
                className="rounded-full text-[#8E8C85] hover:bg-[#F2F0EB] dark:text-[#9D9DA8] dark:hover:bg-[#22222A]"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Glowing Icon */}
            <div className="relative size-16 mx-auto mb-4 rounded-2xl bg-[#EEF2FF] dark:bg-[#20202E] flex items-center justify-center text-[#5E5CE6] dark:text-[#818CF8] shadow-lg shadow-[#5E5CE6]/15">
              {isDenied ? (
                <ShieldAlert className="size-8 stroke-[2.2]" />
              ) : (
                <Bell className="size-8 stroke-[2.2]" />
              )}
            </div>

            <h3 className="text-base font-bold text-[#1C1C1E] dark:text-[#F4F4F6] tracking-tight">
              {isDenied ? "Reminders Are Off" : "Never Miss a Moment"}
            </h3>

            <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] mt-2 mb-6 leading-relaxed">
              {isDenied
                ? "Notification permissions were previously disabled. Scheduled task reminders will not alert you until enabled in Android App Settings."
                : "Mark Your Day sends gentle, motivating reminders only when you explicitly schedule a task time. No spam or promotional alerts."}
            </p>

            <div className="space-y-2">
              {!isDenied ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={onEnable}
                  className="w-full rounded-xl bg-[#5E5CE6] text-white shadow-md shadow-[#5E5CE6]/25 hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:shadow-[#7C79F2]/25 dark:hover:bg-[#6865E8]"
                >
                  <Check className="size-4 stroke-[2.5]" />
                  Enable Reminders
                </Button>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={onDismiss}
                className="w-full text-[#71717A] dark:text-[#9D9DA8]"
              >
                {isDenied ? "Got It" : "Maybe Later"}
              </Button>
            </div>
      </DrawerContent>
    </Drawer>
  );
};
