import Card from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";

export default function ActivityCard({ icon: Icon, label, percentage }) {
  const tone = percentage >= 80 ? "sage" : percentage >= 60 ? "saffron" : "clay";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-sm font-medium text-brown-700">
          {Icon && <Icon className="h-4 w-4 text-maroon-500" aria-hidden="true" />}
          {label}
        </span>
        <span className="font-display text-lg font-semibold text-brown-900">{percentage}%</span>
      </div>
      <ProgressBar value={percentage} tone={tone} />
    </Card>
  );
}
