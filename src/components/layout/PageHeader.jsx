export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold text-maroon-600 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-brown-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
