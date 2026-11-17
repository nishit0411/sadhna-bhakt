import { useRef } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

/**
 * Read-only date display for the Sadhana form header, or a "< Month Year >"
 * navigator when `onPrev`/`onNext` are supplied (used by History/Reports).
 *
 * Pass `value` (YYYY-MM-DD) + `onSelect(iso)` to also make the label open a
 * calendar popup (the browser's native date picker, same as the Devotees
 * page), with optional `min` / `max`.
 */
export default function DatePicker({
  label,
  onPrev,
  onNext,
  nextDisabled,
  className = "",
  value,
  onSelect,
  min,
  max,
  prevLabel = "Previous month",
  nextLabel = "Next month",
}) {
  const isNav = Boolean(onPrev || onNext);
  const inputRef = useRef(null);
  const hasCalendar = Boolean(onSelect);

  function openCalendar() {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker(); // Chrome / Edge / Safari 16+ / Firefox 101+
    } catch {
      input.focus();
      input.click();
    }
  }

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border border-brown-900/10 bg-cream-50 px-4 py-2.5 text-sm font-medium text-brown-900 ${className}`}
    >
      {isNav && (
        <button
          type="button"
          onClick={onPrev}
          aria-label={prevLabel}
          className="rounded-full p-1 text-maroon-500 hover:bg-beige-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {hasCalendar ? (
        <span className="relative">
          <button
            type="button"
            onClick={openCalendar}
            aria-label={`${label} — choose date`}
            className="flex items-center gap-2 rounded-lg px-1 hover:text-maroon-600 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          >
            <CalendarDays className="h-4 w-4 text-maroon-400" />
            {label}
          </button>
          <input
            ref={inputRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            value={value ?? ""}
            min={min}
            max={max}
            onChange={(e) => e.target.value && onSelect(e.target.value)}
            className="pointer-events-none absolute bottom-0 left-0 h-0 w-full opacity-0"
          />
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-maroon-400" />
          {label}
        </span>
      )}
      {isNav && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label={nextLabel}
          className="rounded-full p-1 text-maroon-500 hover:bg-beige-200 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
