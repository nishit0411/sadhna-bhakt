import Card from "../ui/Card";

const TONES = {
  maroon: "bg-maroon-50 text-maroon-600",
  saffron: "bg-saffron-100 text-saffron-600",
  sage: "bg-sage-100 text-sage-600",
  clay: "bg-clay-100 text-clay-600",
};

export default function StatCard({ icon: Icon, label, value, suffix, tone = "maroon", trend }) {
  return (
    <Card className="flex items-center gap-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-500">{label}</p>
        <p className="mt-0.5 truncate font-display text-2xl font-semibold text-brown-900">
          {value}
          {suffix && <span className="ml-1 text-sm font-sans font-normal text-brown-500">{suffix}</span>}
        </p>
        {trend && <p className="mt-0.5 text-xs text-sage-600">{trend}</p>}
      </div>
    </Card>
  );
}
