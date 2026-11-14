/**
 * Warms the lazily-loaded page chunks for a signed-in role.
 *
 * Pages are code-split with React.lazy (App.jsx). React Router v7 runs each
 * navigation as a React transition, so when a page's chunk is not downloaded
 * yet React keeps the *previous* page on screen — no spinner, no active menu
 * highlight — until it arrives. On a slow / mobile connection a sidebar click
 * then looks like it did nothing and people click 2–3 times.
 *
 * Importing the same modules ahead of time (when the browser is idle after
 * the layout mounts) fills the module cache, so React.lazy resolves
 * instantly and every menu click switches pages immediately.
 */
const PAGES = {
  admin: [
    () => import("../pages/admin/AdminDashboard"),
    () => import("../pages/admin/Devotees"),
    () => import("../pages/admin/Analytics"),
    () => import("../pages/admin/Reports"),
    () => import("../pages/admin/MentorManagement"),
    () => import("../pages/admin/UserManagement"),
    () => import("../pages/admin/DevoteeDetail"),
  ],
  mentor: [
    () => import("../pages/mentor/MentorDashboard"),
    () => import("../pages/admin/Analytics"),
    () => import("../pages/mentor/MentorReports"),
    () => import("../pages/devotee/DailySadhana"),
    () => import("../pages/devotee/Profile"),
    () => import("../pages/admin/DevoteeDetail"),
  ],
};

const done = new Set();

export function preloadPages(role) {
  if (done.has(role) || !PAGES[role]) return;
  done.add(role);
  const run = () => PAGES[role].forEach((load) => load().catch(() => done.delete(role)));
  if (typeof window !== "undefined" && "requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 500);
}
