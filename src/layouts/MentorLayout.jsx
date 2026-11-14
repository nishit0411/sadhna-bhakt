import { useEffect, useState, Suspense } from "react";
import LoadingState from "../components/ui/LoadingState";
import { Outlet } from "react-router-dom";
import { LayoutDashboard, NotebookPen, UserRound, BarChart3, ChartNoAxesCombined } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import DeveloperCredit from "../components/layout/DeveloperCredit";
import { useTranslation } from "../i18n/LanguageContext";
import { preloadPages } from "../utils/preloadPages";

export default function MentorLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t } = useTranslation();

  // Download the other pages in the background so menu clicks switch instantly.
  useEffect(() => preloadPages("mentor"), []);

  const NAV_ITEMS = [
    { label: t("nav.mentorDashboard"), to: "/mentor/dashboard", icon: LayoutDashboard, end: true },
    { label: t("nav.dailySadhana"), to: "/mentor/sadhana", icon: NotebookPen },
    { label: t("nav.myProfile"), to: "/mentor/profile", icon: UserRound },
    { label: t("nav.mentorAnalytics"), to: "/mentor/analytics", icon: ChartNoAxesCombined },
    { label: t("nav.mentorReports"), to: "/mentor/reports", icon: BarChart3 },
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
