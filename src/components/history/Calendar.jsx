import { CheckCircle2 } from "lucide-react";
import { isFuture, isToday } from "../../utils/dateHelpers";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar({ cells, recordsByDate, onSelectDay }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 pb-2 text-center text-xs font-medium uppercase tracking-wide text-brown-500 sm:gap-2">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;

          const record = recordsByDate.get(date);
          const dayNumber = Number(date.slice(-2));
          const future = isFuture(date);
          const today = isToday(date);

          if (future) {
            return (
              <div key={date} className="flex aspect-square items-center justify-center rounded-xl text-sm text-brown-900/20">
                {dayNumber}
              </div>
            );
          }

          if (!record) {
            return (
              <div
                key={date}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-sm ${
                  today ? "border-saffron-400 text-brown-700" : "border-transparent text-brown-400"
                } bg-cream-100`}
              >
                {dayNumber}
                <span className="text-[10px] text-brown-400">—</span>
              </div>
            );
          }

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDay(record)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border border-sage-300 bg-sage-100 text-sm font-medium text-sage-600 transition-transform hover:scale-105 ${
                today ? "ring-2 ring-saffron-400 ring-offset-1 ring-offset-cream-50" : ""
              }`}
            >
              <span>{dayNumber}</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
