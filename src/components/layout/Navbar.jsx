import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, User as UserIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/LanguageContext";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const profileHref = user?.role === "admin" ? "/admin/dashboard" : "/devotee/profile";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-brown-900/5 bg-cream-50/95 px-3 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="rounded-lg p-2 text-brown-700 hover:bg-beige-200 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link to={profileHref} className="hidden items-center gap-2 sm:flex">
          <Logo compact />
        </Link>
        <p className="min-w-0 truncate font-display text-base font-medium text-maroon-600 sm:hidden">
          {t("landing.hareKrishnaGreeting")}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <LanguageSwitcher />

        <button
          aria-label="Notifications"
          className="relative rounded-full p-2 text-brown-600 hover:bg-beige-200"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-saffron-500" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-brown-900/10 py-1 pl-1 pr-3 hover:bg-beige-200"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-maroon-500 text-xs font-semibold text-cream-50">
              {user?.initials ?? <UserIcon className="h-4 w-4" />}
            </span>
            <span className="hidden text-sm font-medium text-brown-800 sm:inline">{user?.name?.split(" ")[0]}</span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-brown-900/5 bg-cream-50 shadow-lifted">
                <Link
                  to={profileHref}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-brown-700 hover:bg-beige-100"
                >
                  <UserIcon className="h-4 w-4" /> {t("nav.myProfile")}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-clay-600 hover:bg-beige-100"
                >
                  <LogOut className="h-4 w-4" /> {t("common.logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
