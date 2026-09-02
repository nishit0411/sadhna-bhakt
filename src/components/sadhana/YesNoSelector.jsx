import { Check, X } from "lucide-react";
import { useTranslation } from "../../i18n/LanguageContext";

/**
 * Large, touch-friendly Yes/No cards (in place of tiny radio buttons) used
 * across every Sadhana question. Labels follow the active site language.
 */
export default function YesNoSelector({ value, onChange, name }) {
  const { t } = useTranslation();
  const options = [
    { key: true, label: t("common.yes"), icon: Check },
    { key: false, label: t("common.no"), icon: X },
  ];

  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-2 gap-3">
      {options.map(({ key, label, icon: Icon }) => {
        const selected = value === key;
        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={`flex items-center justify-center gap-2.5 rounded-2xl border-2 px-4 py-4 text-base font-medium transition-all duration-150 ${
              selected
                ? key
                  ? "border-sage-500 bg-sage-50 text-sage-600 shadow-soft"
                  : "border-clay-400 bg-clay-100 text-clay-600 shadow-soft"
                : "border-brown-900/8 bg-cream-50 text-brown-500 hover:border-brown-900/15"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                selected ? (key ? "bg-sage-500 text-cream-50" : "bg-clay-600 text-cream-50") : "bg-brown-900/10 text-transparent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
