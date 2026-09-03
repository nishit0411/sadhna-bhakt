export default function Input({ label, error, required, id, className = "", ...props }) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-brown-700">
          {label}
          {required && <span className="ml-0.5 text-maroon-500">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-xl border border-brown-900/10 bg-cream-50 px-4 py-2.5 text-base text-brown-900 placeholder:text-brown-500/50 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 disabled:cursor-not-allowed disabled:bg-beige-100 disabled:text-brown-500 sm:text-sm ${error ? "border-clay-400" : ""} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-clay-600">
          {error}
        </p>
      )}
    </div>
  );
}
