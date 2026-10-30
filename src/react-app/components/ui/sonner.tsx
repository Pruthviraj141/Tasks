import { useTheme } from "../../hooks/useTheme";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      offset="calc(5.5rem + env(safe-area-inset-bottom, 0px))"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500" />,
        info: <InfoIcon className="size-4 text-[#4F46E5] dark:text-[#818CF8]" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
        error: <OctagonXIcon className="size-4 text-rose-500" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast rounded-xl shadow-lg border border-[#E6E4DC] dark:border-[#242429] bg-white dark:bg-[#1A1A20] text-[#18181B] dark:text-[#F4F4F6] text-xs font-medium",
          actionButton: "rounded-lg bg-[#4F46E5] text-white hover:bg-[#4338CA] dark:bg-[#6366F1] px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer touch-manipulation min-h-[36px] flex items-center justify-center",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
