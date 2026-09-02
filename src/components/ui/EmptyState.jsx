import { Flower2 } from "lucide-react";

export default function EmptyState({ icon: Icon = Flower2, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-maroon-200 bg-beige-50 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-saffron-100 text-saffron-600">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="font-display text-lg font-semibold text-maroon-600">{title}</h3>
      {description && <p className="max-w-sm text-sm text-brown-500">{description}</p>}
      {action}
    </div>
  );
}
