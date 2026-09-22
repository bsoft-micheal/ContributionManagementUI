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
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ForgotPasswordVerifyPage from "../pages/auth/ForgotPasswordVerifyPage";
import ForgotPasswordResetPage from "../pages/auth/ForgotPasswordResetPage";
import MembersPage from "../pages/members/MembersPage";
import ReportsPage from "../pages/reports/ReportsPage";
import MyContributionSummaryPage from "../pages/contributions/MyContributionSummaryPage";
import ContributionCalculationPage from "../pages/contributions/ContributionCalculationPage";
import ExitProcessPage from "../pages/members/ExitProcessPage";
import UserRightsPage from "../pages/members/UserRightsPage";
import UsersPage from "../pages/members/UsersPage";
import RolesPage from "../pages/members/RolesPage";
import SessionHistoryPage from "../pages/auth/SessionHistoryPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/forgot-password/verify" element={<ForgotPasswordVerifyPage />} />
      <Route path="/forgot-password/reset" element={<ForgotPasswordResetPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
        <Route path="/roles" element={<ProtectedRoute><RolesPage /></ProtectedRoute>} />
        <Route path="/event-types" element={<ProtectedRoute><EventTypesPage /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><EventDetailsPage /></ProtectedRoute>} />
        <Route path="/contributions" element={<ProtectedRoute><ContributionsPage /></ProtectedRoute>} />
        <Route path="/my-contributions" element={<ProtectedRoute><MyContributionSummaryPage /></ProtectedRoute>} />
        <Route path="/reports" element={<Navigate to="/reports/event-collection-audit" replace />} />
        <Route path="/reports/event-collection-audit" element={<ProtectedRoute><ReportsPage mode="event" /></ProtectedRoute>} />
        <Route path="/reports/member-velocity" element={<ProtectedRoute><ReportsPage mode="member" /></ProtectedRoute>} />
        <Route path="/reports/pending-dues" element={<ProtectedRoute><ReportsPage mode="pending" /></ProtectedRoute>} />
        <Route path="/reports/member-category-paid" element={<ProtectedRoute><ReportsPage mode="member-category" /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/contribution-calculation" element={<ProtectedRoute><ContributionCalculationPage /></ProtectedRoute>} />
        <Route path="/session-history" element={<ProtectedRoute><SessionHistoryPage /></ProtectedRoute>} />
        <Route path="/exit-process" element={<ProtectedRoute><ExitProcessPage /></ProtectedRoute>} />
        <Route path="/user-rights" element={<ProtectedRoute roles={["Admin", "Manager"]}><UserRightsPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute roles={["Admin", "Manager"]}><UsersPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
