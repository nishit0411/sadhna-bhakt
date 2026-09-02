import { Check } from "lucide-react";

const OPTIONS = ["Male", "Female"];

export default function GenderSelector({ label = "Sex", required, value, onChange, error, maleLabel, femaleLabel }) {
  const displayLabels = { Male: maleLabel ?? "Male", Female: femaleLabel ?? "Female" };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-brown-700">
        {label}
        {required && <span className="ml-0.5 text-maroon-500">*</span>}
      </span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
        {OPTIONS.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3.5 text-sm font-medium transition-all duration-150 ${
                selected
                  ? "border-maroon-500 bg-maroon-50 text-maroon-600 shadow-soft"
                  : "border-brown-900/8 bg-cream-50 text-brown-600 hover:border-saffron-400"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  selected ? "bg-maroon-500 text-cream-50" : "bg-brown-900/10 text-transparent"
                }`}
              >
                <Check className="h-3 w-3" />
              </span>
              {displayLabels[option]}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-clay-600">{error}</p>}
    </div>
  );
}
