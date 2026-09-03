import { MALA_MIN, MALA_MAX } from "../../utils/scoring";

/**
 * Integer-only numeric input (no decimals, no negatives) used for Mala
 * counts. Deliberately `type="text"` rather than `type="number"` — Chrome's
 * native number input doesn't reliably re-sync its displayed text back to
 * a corrected controlled value (e.g. typing "1" after an existing "0" can
 * leave the DOM showing "01" indefinitely instead of snapping to "1"), so
 * leading zeros are never actually cleaned up once the browser's own
 * number-parsing kicks in. A plain text input with digit-only filtering
 * plus `inputMode="numeric"` (mobile numeric keypad) sidesteps that
 * entirely and stays fully React-controlled.
 */
export default function NumberField({ label, required, error, helperText, value, onChange, name, min = MALA_MIN, max = MALA_MAX }) {
  function handleChange(e) {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/[^\d]/g, "");
    if (digitsOnly === "") {
      onChange("");
      return;
    }
    // Strips any leading zeros before clamping (e.g. "05" -> 5, "00" -> 0)
    // so the numeric value is always exact — the display string below is
    // then derived straight from that number, never from raw keystrokes.
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
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "." || e.key === "e" || e.key === "+") e.preventDefault();
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
