import Card from "../ui/Card";

const TONES = {
  maroon: "bg-maroon-50 text-maroon-600",
  saffron: "bg-saffron-100 text-saffron-600",
  sage: "bg-sage-100 text-sage-600",
  clay: "bg-clay-100 text-clay-600",
};

/** `onClick` is optional — cards remain plain display when omitted, become an interactive button (with hover/focus affordance) when provided. */
export default function StatCard({ icon: Icon, label, value, suffix, tone = "maroon", trend, onClick }) {
  const interactive = Boolean(onClick);

  return (
    <Card
      as={interactive ? "button" : "div"}
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-4 text-left ${
        interactive ? "cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lifted focus-visible:outline-none" : ""
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-500">{label}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1 font-display text-2xl font-semibold text-brown-900">
          <span className="truncate">{value}</span>
          {suffix && <span className="text-sm font-sans font-normal text-brown-500">{suffix}</span>}
        </p>
        {trend && <p className="mt-0.5 text-xs text-sage-600">{trend}</p>}
      </div>
    </Card>
  );
}
