import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import FormInput from "./FormInput";
import { useTranslation } from "../i18n/LanguageContext";
import { canonicalPlace, suggestPlaces } from "../utils/location";

const DEBOUNCE_MS = 250;

/** City name with the typed portion bolded. */
function Highlighted({ name, match }) {
  if (!match) return <span>{name}</span>;
  const [a, b] = match;
  return (
    <span>
      {name.slice(0, a)}
      <mark className="bg-transparent font-semibold text-maroon-600">{name.slice(a, b)}</mark>
      {name.slice(b)}
    </span>
  );
}

/**
 * City field with autocomplete + spelling correction.
 *  - Suggestions start after 2 characters, 250 ms after typing stops.
 *  - Exact and prefix matches rank above spelling matches ("Gaziyabad" → Ghaziabad).
 *  - Shows district and state under each city; typed part is highlighted.
 *  - Keyboard: ↑/↓ to move, Enter/Tab to pick, Esc to close.
 *  - On leaving the field, a recognised misspelling is replaced with the
 *    correct name; unknown towns are kept exactly as typed.
 *
 * Same props as FormInput, plus `onValueChange(value)` to set the city.
 */
export default function CityInput({ value, onValueChange, onChange, disabled, ...props }) {
  const { t } = useTranslation();
  const listId = useId();
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const focused = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = suggestPlaces(value);
      // Hide the list when it would only repeat exactly what is already typed.
      const redundant = next.length === 1 && next[0].name === (value ?? "").trim();
      setSuggestions(redundant ? [] : next);
      setActive(-1);
      setOpen(focused.current && !redundant && next.length > 0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const correct = canonicalPlace(value);
  const needsFix = Boolean(correct) && correct !== (value ?? "").trim();

  function choose(name) {
    onValueChange(name);
    setOpen(false);
    setSuggestions([]);
  }

  function handleKeyDown(e) {
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if ((e.key === "Enter" || e.key === "Tab") && active >= 0) {
      e.preventDefault();
      choose(suggestions[active].name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-1">
      <FormInput
        {...props}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          focused.current = true;
          if (suggestions.length) setOpen(true);
        }}
        onBlur={() => {
          focused.current = false;
          setOpen(false);
          if (needsFix) onValueChange(correct);
        }}
      />

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-brown-900/10 bg-white py-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.name}-${s.state}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input doesn't blur first and close the list
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s.name);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm ${i === active ? "bg-cream-100" : ""}`}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-maroon-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-brown-900">
                  <Highlighted name={s.name} match={s.match} />
                </p>
                {(s.district || s.state) && (
                  <p className="truncate text-xs text-brown-500">
                    {[s.district && s.district !== s.name ? `${s.district} district` : null, s.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {needsFix && !disabled && !open && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => choose(correct)}
          className="self-start text-xs text-maroon-600 underline-offset-2 hover:underline"
        >
          {t("register.cityDidYouMean", { city: correct })}
        </button>
      )}
    </div>
  );
}
