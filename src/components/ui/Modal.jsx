import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children, footer, size = "md" }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brown-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${widths[size]} max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream-50 shadow-lifted sm:rounded-3xl animate-[fadeIn_.15s_ease-out]`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brown-900/5 bg-cream-50 px-6 py-4">
          <h3 className="font-display text-xl font-semibold text-maroon-600">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-brown-500 hover:bg-beige-200 hover:text-brown-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-brown-900/5 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
