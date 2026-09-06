export const MENTOR_OPTIONS = [
  "Srila Gurudev",
  "Sripad Gaursunder Prabhu",
  "Sripad Krishandas Prabhu",
  "Sripad Madhav Prabhu",
  "Sripad Sanjay Prabhu",
  "Sripad Shyamanand Prabhu",
  "Sripad Tapan Prabhu",
  "Other",
];

/** Joins selected mentor values into a display string, substituting the free-text entry for "Other". */
export function formatMentorNames(values, otherText) {
  if (!values?.length) return "—";
  return values.map((v) => (v === "Other" && otherText ? otherText : v)).join(", ");
}
