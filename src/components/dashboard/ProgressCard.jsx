export default function ProgressCard({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-cream-50 px-4 py-3.5 text-center">
      <p className="font-display text-2xl font-semibold text-maroon-600">{value}</p>
      <p className="text-xs font-medium text-brown-500">{label}</p>
    </div>
  );
}
