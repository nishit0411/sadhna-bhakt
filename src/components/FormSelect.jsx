import { ChevronDown } from "lucide-react";

export default function FormSelect({ label, required, error, options, placeholder, id, className = "", ...props }) {
  const selectId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-brown-700">
          {label}
          {required && <span className="ml-0.5 text-maroon-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`w-full appearance-none rounded-xl border border-brown-900/10 bg-cream-50 px-4 py-2.5 pr-10 text-base focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 sm:text-sm ${
            props.value ? "text-brown-900" : "text-brown-500/60"
          } ${error ? "border-clay-400" : ""} ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-500" />
      </div>
      {error && (
        <p id={`${selectId}-error`} className="text-xs text-clay-600">
          {error}
        </p>
      )}
    </div>
  );
}
