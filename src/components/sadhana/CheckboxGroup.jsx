import { Check } from "lucide-react";

/**
 * Multi-select checkbox list used for Granth Reading and Harikatha.
 * `exclusiveValue` (e.g. "None / नहीं पढ़ा") clears every other selection
 * when chosen, and is itself cleared the moment any other box is checked.
 * `otherValue` triggers a text field for a free-form entry.
 */
export default function CheckboxGroup({
  name,
  options,
  values = [],
  onChange,
  exclusiveValue,
  otherValue = "Other",
  otherText,
  onOtherTextChange,
  otherLabel,
  otherPlaceholder,
}) {
  function toggle(option) {
    if (option === exclusiveValue) {
      onChange(values.includes(option) ? [] : [option]);
      return;
    }
    const withoutExclusive = values.filter((v) => v !== exclusiveValue);
    if (withoutExclusive.includes(option)) {
      onChange(withoutExclusive.filter((v) => v !== option));
    } else {
      onChange([...withoutExclusive, option]);
    }
  }

  return (
    <div>
      <div role="group" aria-label={name} className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => toggle(option)}
              className={`flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
                selected
                  ? "border-maroon-500 bg-maroon-50 text-maroon-600 shadow-soft"
                  : "border-brown-900/8 bg-cream-50 text-brown-700 hover:border-saffron-400"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                  selected ? "bg-maroon-500 text-cream-50" : "bg-brown-900/10 text-transparent"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {values.includes(otherValue) && (
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-brown-700">{otherLabel}</label>
          <input
            type="text"
            value={otherText}
            onChange={(e) => onOtherTextChange(e.target.value)}
            placeholder={otherPlaceholder}
            className="w-full rounded-xl border border-brown-900/10 bg-cream-50 px-4 py-2.5 text-sm text-brown-900 placeholder:text-brown-500/50 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </div>
      )}
    </div>
  );
}
