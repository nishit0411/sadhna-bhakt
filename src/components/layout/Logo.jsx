export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className={compact ? "h-7 w-7" : "h-10 w-10"} aria-hidden="true">
        <circle cx="32" cy="32" r="32" fill="#7A2E3A" />
        <g fill="#E9C98A">
          <path d="M32 14c2.5 4 2.5 9 0 13-2.5-4-2.5-9 0-13z" />
          <path d="M32 50c-2.5-4-2.5-9 0-13 2.5 4 2.5 9 0 13z" />
          <path d="M14 32c4-2.5 9-2.5 13 0-4 2.5-9 2.5-13 0z" />
          <path d="M50 32c-4 2.5-9 2.5-13 0 4-2.5 9-2.5 13 0z" />
          <path d="M20.5 20.5c4.4-1 8.9.6 11.5 4.2-4.4 1-8.9-.6-11.5-4.2z" />
          <path d="M43.5 43.5c-4.4 1-8.9-.6-11.5-4.2 4.4-1 8.9.6 11.5 4.2z" />
          <path d="M43.5 20.5c-1 4.4-.6 8.9-4.2 11.5-1-4.4.6-8.9 4.2-11.5z" />
          <path d="M20.5 43.5c1-4.4-.6-8.9 4.2-11.5 1 4.4-.6 8.9-4.2 11.5z" />
          <circle cx="32" cy="32" r="4.5" />
        </g>
      </svg>
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-lg font-semibold text-maroon-600">Sadhana Bhakti</p>
          <p className="text-[11px] tracking-wide text-brown-500">Daily Sadhana · Bhajan · Seva</p>
        </div>
      )}
      {compact && <p className="font-display text-base font-semibold text-maroon-600">Sadhana Bhakti</p>}
    </div>
  );
}
