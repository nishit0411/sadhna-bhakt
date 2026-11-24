import { useState } from "react";

const TONES = {
  maroon: "bg-maroon-500 text-cream-50",
  saffron: "bg-saffron-500 text-cream-50",
  sage: "bg-sage-500 text-cream-50",
  soft: "bg-maroon-100 text-maroon-600",
};

const SIZES = {
  xs: "h-7 w-7 text-xs",
  sm: "h-9 w-9 text-xs",
  lg: "h-20 w-20 text-2xl",
};

/**
 * Profile photo when the person has one, otherwise their initials on a
 * coloured circle. Falls back to initials if the image fails to load.
 * `person` needs { name, initials, avatarColor, avatarUrl }.
 */
export default function Avatar({ person, size = "sm", tone, className = "" }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const url = person?.avatarUrl;
  const showPhoto = Boolean(url) && failedUrl !== url;
  const toneClass = TONES[tone ?? person?.avatarColor] ?? TONES.maroon;

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${SIZES[size] ?? SIZES.sm} ${
        showPhoto ? "bg-beige-200" : toneClass
      } ${className}`}
    >
      {showPhoto ? (
        <img
          src={url}
          alt={person?.name ? `${person.name}` : ""}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(url)}
          className="h-full w-full object-cover"
        />
      ) : (
        person?.initials ?? ""
      )}
    </span>
  );
}
