import { NavLink } from "react-router-dom";

export default function MobileNav({ items }) {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-brown-900/10 bg-cream-50/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map(({ label, to, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              isActive ? "text-maroon-600" : "text-brown-500/70"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isActive ? "bg-saffron-100" : ""}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
