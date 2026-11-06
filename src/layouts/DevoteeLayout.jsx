import { useState, Suspense } from "react";
import LoadingState from "../components/ui/LoadingState";
import { Outlet } from "react-router-dom";
import { LayoutDashboard, NotebookPen, History, BarChart3, UserRound } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import DeveloperCredit from "../components/layout/DeveloperCredit";
import { useTranslation } from "../i18n/LanguageContext";

export default function DevoteeLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { label: t("nav.dashboard"), to: "/devotee/dashboard", icon: LayoutDashboard, end: true },
    { label: t("nav.dailySadhana"), to: "/devotee/sadhana", icon: NotebookPen },
    { label: t("nav.myHistory"), to: "/devotee/history", icon: History },
    { label: t("nav.monthlyReport"), to: "/devotee/monthly-report", icon: BarChart3 },
    { label: t("nav.myProfile"), to: "/devotee/profile", icon: UserRound },
  ];

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar items={NAV_ITEMS} isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pb-10 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Suspense fallback={<LoadingState />}><Outlet /></Suspense>
          </div>
          <DeveloperCredit className="mt-10 pb-2" />
        </main>
        <MobileNav items={NAV_ITEMS} />
      </div>
    </div>
  );
}
