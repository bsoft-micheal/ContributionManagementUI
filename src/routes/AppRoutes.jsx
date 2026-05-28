import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import CalendarPage from "../pages/events/CalendarPage";
import ContributionsPage from "../pages/contributions/ContributionsPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import EventDetailsPage from "../pages/events/EventDetailsPage";
import EventTypesPage from "../pages/events/EventTypesPage";
import EventsPage from "../pages/events/EventsPage";
import LoginPage from "../pages/auth/LoginPage";
import MembersPage from "../pages/members/MembersPage";
import ReportsPage from "../pages/reports/ReportsPage";
import ContributionCalculationPage from "../pages/contributions/ContributionCalculationPage";
import ExitProcessPage from "../pages/members/ExitProcessPage";
import UserRightsPage from "../pages/members/UserRightsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
        <Route path="/event-types" element={<ProtectedRoute><EventTypesPage /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><EventDetailsPage /></ProtectedRoute>} />
        <Route path="/contributions" element={<ProtectedRoute><ContributionsPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/contribution-calculation" element={<ProtectedRoute><ContributionCalculationPage /></ProtectedRoute>} />
        <Route path="/exit-process" element={<ProtectedRoute><ExitProcessPage /></ProtectedRoute>} />
        <Route path="/user-rights" element={<ProtectedRoute roles={["Admin", "Manager"]}><UserRightsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
