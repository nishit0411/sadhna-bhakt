import { Clock } from "lucide-react";
import { to12Hour } from "../../utils/dateHelpers";

export default function TimePicker({ label, required, value, onChange, id, name }) {
  const fieldId = id ?? name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-sm font-medium text-brown-700">
          {label}
          {required && <span className="ml-0.5 text-maroon-500">*</span>}
        </label>
      )}
      <div className="relative">
        <Clock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-400" />
        <input
          id={fieldId}
          name={name}
          type="time"
          value={value}
          onChange={onChange}
          className="w-full rounded-xl border border-brown-900/10 bg-cream-50 py-3 pl-11 pr-4 text-sm font-medium text-brown-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </div>
      {value && <p className="pl-1 text-xs text-brown-500">{to12Hour(value)}</p>}
    </div>
  );
}
