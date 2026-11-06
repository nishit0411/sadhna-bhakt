import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function FormInput({ label, required, error, helperText, icon: Icon, prefix, id, className = "", type, ...props }) {
  const inputId = id ?? props.name;
  const isPassword = type === "password";
  const [show, setShow] = useState(false);
  const leftPad = prefix ? "pl-14" : Icon ? "pl-10" : "pl-4";

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-brown-700">
          {label}
          {required && <span className="ml-0.5 text-maroon-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && !prefix && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-400" />}
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-brown-600">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type={isPassword && show ? "text" : type}
          className={`w-full rounded-xl border border-brown-900/10 bg-cream-50 py-2.5 ${isPassword ? "pr-10" : "pr-4"} text-base text-brown-900 placeholder:text-brown-500/50 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 disabled:cursor-not-allowed disabled:bg-beige-100 disabled:text-brown-500 sm:text-sm ${leftPad} ${error ? "border-clay-400" : ""} ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-brown-500 hover:text-maroon-600 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="text-xs text-brown-500">
          {helperText}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-clay-600">
          {error}
        </p>
      )}
    </div>
  );
}
