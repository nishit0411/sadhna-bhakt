import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/LanguageContext";
import Logo from "./Logo";

export default function Sidebar({ items, isOpen, onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const content = (
    <div className="flex h-full flex-col bg-maroon-700 text-cream-100">
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="[&_p]:text-cream-50 [&_p:last-child]:text-saffron-200/80">
          <Logo />
        </div>
        <button onClick={onClose} aria-label="Close menu" className="rounded-lg p-1.5 text-cream-200 hover:bg-maroon-600 lg:hidden">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary navigation">
        {items.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-saffron-400 text-maroon-700 shadow-soft" : "text-cream-100/85 hover:bg-maroon-600"
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-cream-100/10 px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-cream-100/85 hover:bg-maroon-600"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          {t("common.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">{content}</aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-brown-900/40" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] shadow-lifted">{content}</div>
        </div>
      )}
    </>
  );
}
