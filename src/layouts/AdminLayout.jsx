import { useState } from "react";
import { Outlet } from "react-router-dom";
import { LayoutDashboard, Users, FileBarChart, ChartNoAxesCombined, UserCog } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import DeveloperCredit from "../components/layout/DeveloperCredit";
import { useTranslation } from "../i18n/LanguageContext";

export default function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { label: t("nav.adminDashboard"), to: "/admin/dashboard", icon: LayoutDashboard, end: true },
    { label: t("nav.adminDevotees"), to: "/admin/devotees", icon: Users },
    { label: t("nav.adminAnalytics"), to: "/admin/analytics", icon: ChartNoAxesCombined },
    { label: t("nav.adminReports"), to: "/admin/reports", icon: FileBarChart },
    { label: t("nav.adminUserManagement"), to: "/admin/users", icon: UserCog },
  ];

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar items={NAV_ITEMS} isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pb-10 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
          <DeveloperCredit className="mt-10 pb-2" />
        </main>
        <MobileNav items={NAV_ITEMS} />
      </div>
    </div>
  );
}
