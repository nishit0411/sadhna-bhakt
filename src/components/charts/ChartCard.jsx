import Card from "../ui/Card";

export default function ChartCard({ title, subtitle, action, children, height = 260 }) {
  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-maroon-600">{title}</h3>
          {subtitle && <p className="text-xs text-brown-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ width: "100%", height }}>{children}</div>
    </Card>
  );
}
