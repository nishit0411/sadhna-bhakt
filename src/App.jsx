import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoadingState from "./components/ui/LoadingState";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Register = lazy(() => import("./pages/Register"));
import ProtectedRoute from "./layouts/ProtectedRoute";
import DevoteeLayout from "./layouts/DevoteeLayout";
import AdminLayout from "./layouts/AdminLayout";
import MentorLayout from "./layouts/MentorLayout";

const Dashboard = lazy(() => import("./pages/devotee/Dashboard"));
const DailySadhana = lazy(() => import("./pages/devotee/DailySadhana"));
const AutofillSetup = lazy(() => import("./pages/devotee/AutofillSetup"));
const History = lazy(() => import("./pages/devotee/History"));
const MonthlyReport = lazy(() => import("./pages/devotee/MonthlyReport"));
const Profile = lazy(() => import("./pages/devotee/Profile"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Devotees = lazy(() => import("./pages/admin/Devotees"));
const DevoteeDetail = lazy(() => import("./pages/admin/DevoteeDetail"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const UserDetail = lazy(() => import("./pages/admin/UserDetail"));
const MentorManagement = lazy(() => import("./pages/admin/MentorManagement"));

const MentorDashboard = lazy(() => import("./pages/mentor/MentorDashboard"));
const MentorReports = lazy(() => import("./pages/mentor/MentorReports"));

export default function App() {
  return (
    <Suspense fallback={<LoadingState fullHeight />}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route element={<ProtectedRoute role="devotee" />}>
        <Route element={<DevoteeLayout />}>
          <Route path="/devotee/dashboard" element={<Dashboard />} />
          <Route path="/devotee/sadhana" element={<DailySadhana />} />
          <Route path="/devotee/sadhana/autofill" element={<AutofillSetup />} />
          <Route path="/devotee/history" element={<History />} />
          <Route path="/devotee/monthly-report" element={<MonthlyReport />} />
          <Route path="/devotee/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="admin" />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/devotees" element={<Devotees />} />
          <Route path="/admin/devotees/:id" element={<DevoteeDetail />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/mentors" element={<MentorManagement />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/users/:id" element={<UserDetail />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="mentor" />}>
        <Route element={<MentorLayout />}>
          <Route path="/mentor/dashboard" element={<MentorDashboard />} />
          <Route path="/mentor/reports" element={<MentorReports />} />
          <Route path="/mentor/sadhana" element={<DailySadhana />} />
          <Route path="/mentor/profile" element={<Profile />} />
          <Route path="/mentor/devotees/:id" element={<DevoteeDetail backPath="/mentor/dashboard" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
