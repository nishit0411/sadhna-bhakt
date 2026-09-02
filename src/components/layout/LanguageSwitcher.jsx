import { useTranslation } from "../../i18n/LanguageContext";

/**
 * `variant="prominent"` renders the full "Select Language" block used on the
 * Landing page. `variant="compact"` renders a small pill-group switcher for
 * use in the header/nav, available on every page.
 */
export default function LanguageSwitcher({ variant = "compact" }) {
  const { language, setLanguage, languages, t } = useTranslation();

  if (variant === "prominent") {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-brown-600">
          Select Language / भाषा चुनें / Выберите язык
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              aria-pressed={language === lang.code}
              className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
                language === lang.code
                  ? "border-maroon-500 bg-maroon-50 text-maroon-600 shadow-soft"
                  : "border-brown-900/10 bg-cream-50 text-brown-600 hover:border-saffron-400"
              }`}
            >
              <span aria-hidden="true">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-beige-100 p-1" role="group" aria-label={t("common.language")}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLanguage(lang.code)}
          aria-pressed={language === lang.code}
          title={lang.label}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors ${
            language === lang.code ? "bg-maroon-500 shadow-soft" : "hover:bg-beige-200"
          }`}
        >
          <span aria-hidden="true">{lang.flag}</span>
          <span className="sr-only">{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
