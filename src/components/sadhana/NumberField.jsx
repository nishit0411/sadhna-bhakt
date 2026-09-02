import { MALA_MIN, MALA_MAX } from "../../utils/scoring";

/** Integer-only numeric input (no decimals, no negatives) used for Mala counts. */
export default function NumberField({ label, required, error, helperText, value, onChange, name, min = MALA_MIN, max = MALA_MAX }) {
  function handleChange(e) {
    const raw = e.target.value;
    if (raw === "") {
      onChange("");
      return;
    }
    const digitsOnly = raw.replace(/[^\d]/g, "");
    if (digitsOnly === "") {
      onChange("");
      return;
    }
    const clamped = Math.max(min, Math.min(max, Number(digitsOnly)));
    onChange(clamped);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-brown-700">
          {label}
          {required && <span className="ml-0.5 text-maroon-500">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "." || e.key === "e") e.preventDefault();
        }}
        className={`w-full rounded-xl border border-brown-900/10 bg-cream-50 px-4 py-2.5 text-sm text-brown-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
          error ? "border-clay-400" : ""
        }`}
        aria-invalid={Boolean(error)}
      />
      {helperText && !error && <p className="text-xs text-brown-500">{helperText}</p>}
      {error && <p className="text-xs text-clay-600">{error}</p>}
    </div>
  );
}
