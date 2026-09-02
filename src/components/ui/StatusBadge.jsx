import { CheckCircle2, Circle, Clock3 } from "lucide-react";

const STYLES = {
  completed: { classes: "bg-sage-100 text-sage-600", icon: CheckCircle2, label: "Completed" },
  pending: { classes: "bg-saffron-100 text-saffron-600", icon: Clock3, label: "Pending" },
  missed: { classes: "bg-clay-100 text-clay-600", icon: Circle, label: "Missed" },
};

export default function StatusBadge({ status = "pending", label, className = "" }) {
  const key = status.toLowerCase();
  const config = STYLES[key] ?? STYLES.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.classes} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label ?? config.label}
    </span>
  );
}
