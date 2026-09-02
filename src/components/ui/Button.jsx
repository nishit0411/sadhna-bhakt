import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-maroon-500 text-cream-50 hover:bg-maroon-600 shadow-soft disabled:bg-maroon-300",
  secondary:
    "bg-saffron-400 text-maroon-700 hover:bg-saffron-500 shadow-soft disabled:bg-saffron-100",
  outline:
    "border border-maroon-300/50 text-maroon-600 bg-transparent hover:bg-maroon-50 disabled:text-maroon-200",
  ghost: "text-brown-700 hover:bg-beige-200 disabled:text-brown-300",
  subtle: "bg-beige-100 text-brown-700 hover:bg-beige-200",
};

const SIZES = {
  sm: "text-sm px-3.5 py-1.5 gap-1.5",
  md: "text-sm px-5 py-2.5 gap-2",
  lg: "text-base px-7 py-3.5 gap-2.5",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  isLoading = false,
  disabled = false,
  icon: Icon,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-70 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="h-4 w-4" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
