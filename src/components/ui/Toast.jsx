import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ICONS = {
  success: { Icon: CheckCircle2, classes: "bg-sage-500 text-cream-50" },
  error: { Icon: AlertCircle, classes: "bg-clay-600 text-cream-50" },
  info: { Icon: Info, classes: "bg-maroon-500 text-cream-50" },
};

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:right-6 sm:left-auto"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const { Icon, classes } = ICONS[toast.type] ?? ICONS.info;
        return (
          <div
            key={toast.id}
            role="status"
            className="flex w-full max-w-sm items-start gap-3 rounded-xl bg-brown-900 px-4 py-3 text-cream-50 shadow-lifted sm:w-auto"
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${classes}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-cream-200/70 hover:text-cream-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
