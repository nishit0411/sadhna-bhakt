import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

/**
 * Read-only date display for the Sadhana form header, or a "< Month Year >"
 * navigator when `onPrev`/`onNext` are supplied (used by History/Reports).
 */
export default function DatePicker({ label, onPrev, onNext, nextDisabled, className = "" }) {
  const isNav = Boolean(onPrev || onNext);

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border border-brown-900/10 bg-cream-50 px-4 py-2.5 text-sm font-medium text-brown-900 ${className}`}
    >
      {isNav && (
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous month"
          className="rounded-full p-1 text-maroon-500 hover:bg-beige-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <span className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-maroon-400" />
        {label}
      </span>
      {isNav && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label="Next month"
          className="rounded-full p-1 text-maroon-500 hover:bg-beige-200 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
