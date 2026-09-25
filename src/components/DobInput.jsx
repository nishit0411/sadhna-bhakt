import { useState } from "react";
import FormInput from "./FormInput";
import { isoToDisplayDate, displayDateToIso, maskDisplayDate } from "../utils/dateHelpers";

/**
 * Date-of-birth field shown as DD/MM/YYYY, stored as YYYY-MM-DD.
 *
 * A native <input type="date"> renders in the *browser's* locale, so the
 * same stored value shows as 15/08/2002 on an en-IN browser and 08/15/2002
 * on en-US. This is a plain text input instead, so the format is the same
 * everywhere regardless of the viewer's locale.
 *
 * `value` in and out is always the ISO string the `date` column stores.
 * onChange emits a synthetic {target:{name,value}} so the existing
 * handleChange in Profile.jsx and UserDetail.jsx keeps working unchanged.
 *
 * Conversion is pure string work (see dateHelpers) — no Date is ever
 * constructed, so no timezone can shift the day.
 */
export default function DobInput({ value, name = "dob", onChange, disabled, invalidMessage, ...rest }) {
  const [text, setText] = useState(() => isoToDisplayDate(value));
  const [lastValue, setLastValue] = useState(value);

  // Re-sync when `value` changes from outside — cancelling an edit restores
  // the saved DOB, or the profile finishes loading. Adjusting state during
  // render (React's documented pattern for deriving from a changed prop)
  // rather than in an effect, so there is no second render pass. The typed
  // text is left alone when it already represents the incoming value, so a
  // half-typed entry isn't wiped by an unrelated re-render.
  if (value !== lastValue) {
    setLastValue(value);
    if (displayDateToIso(text) !== (value || null)) setText(isoToDisplayDate(value));
  }

  function handleInput(e) {
    const masked = maskDisplayDate(e.target.value);
    setText(masked);
    // An incomplete or impossible date propagates as "" rather than a
    // half-parsed value, so nothing invalid can reach the database.
    onChange?.({ target: { name, value: displayDateToIso(masked) ?? "" } });
  }

  const showError = text.length > 0 && displayDateToIso(text) === null;

  return (
    <FormInput
      {...rest}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      placeholder="DD/MM/YYYY"
      maxLength={10}
      value={text}
      onChange={handleInput}
      disabled={disabled}
      error={showError ? invalidMessage : undefined}
    />
  );
}
