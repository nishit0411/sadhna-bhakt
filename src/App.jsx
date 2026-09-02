import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./layouts/ProtectedRoute";
import DevoteeLayout from "./layouts/DevoteeLayout";
import AdminLayout from "./layouts/AdminLayout";

import Dashboard from "./pages/devotee/Dashboard";
import DailySadhana from "./pages/devotee/DailySadhana";
import AutofillSetup from "./pages/devotee/AutofillSetup";
import History from "./pages/devotee/History";
import MonthlyReport from "./pages/devotee/MonthlyReport";
import Profile from "./pages/devotee/Profile";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Devotees from "./pages/admin/Devotees";
import DevoteeDetail from "./pages/admin/DevoteeDetail";
import Reports from "./pages/admin/Reports";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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
          <Route path="/admin/devotees" element={<Devotees />} />
          <Route path="/admin/devotees/:id" element={<DevoteeDetail />} />
          <Route path="/admin/reports" element={<Reports />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
