const TONES = {
  maroon: "bg-maroon-500",
  saffron: "bg-saffron-400",
  sage: "bg-sage-500",
  clay: "bg-clay-400",
};

export default function ProgressBar({ value = 0, max = 100, tone = "maroon", className = "", trackClassName = "" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-brown-900/8 ${trackClassName}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${TONES[tone] ?? TONES.maroon} ${className}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
