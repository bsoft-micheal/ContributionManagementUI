import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import CalendarPage from "../pages/events/CalendarPage";
import ContributionsPage from "../pages/contributions/ContributionsPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import EventDetailsPage from "../pages/events/EventDetailsPage";
import EventFormPage from "../pages/events/EventFormPage";
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
import ExpensePage from "../pages/expenses/ExpensePage";
import SupportTicketsPage from "../pages/support/SupportTicketsPage";
import SettingsPage from "../pages/settings/SettingsPage";
import PaymentsPage from "../pages/payments/PaymentsPage";
import GalleryPage from "../pages/gallery/GalleryPage";
import BudgetCalculationsPage from "../pages/events/BudgetCalculationsPage";
import TypesPage from "../pages/support/TypesPage";
import StatusPage from "../pages/support/StatusPage";

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
        <Route path="/events/add" element={<ProtectedRoute><EventFormPage /></ProtectedRoute>} />
        <Route path="/events/edit/:id" element={<ProtectedRoute><EventFormPage /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><EventDetailsPage /></ProtectedRoute>} />
        <Route path="/contributions" element={<ProtectedRoute><ContributionsPage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
        <Route path="/expense" element={<ProtectedRoute><ExpensePage /></ProtectedRoute>} />
        <Route path="/gallery" element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
        <Route path="/support-tickets" element={<ProtectedRoute><SupportTicketsPage /></ProtectedRoute>} />
        <Route path="/budget-calculations" element={<ProtectedRoute><BudgetCalculationsPage /></ProtectedRoute>} />
        <Route path="/types" element={<ProtectedRoute><TypesPage /></ProtectedRoute>} />
        <Route path="/ticket-types" element={<ProtectedRoute><TypesPage /></ProtectedRoute>} />
        <Route path="/status" element={<ProtectedRoute><StatusPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/my-contributions" element={<ProtectedRoute><MyContributionSummaryPage /></ProtectedRoute>} />
        <Route path="/reports" element={<Navigate to="/reports/event-collection-audit" replace />} />
        <Route path="/reports/event-collection-audit" element={<ProtectedRoute><ReportsPage mode="event" /></ProtectedRoute>} />
        <Route path="/reports/member-velocity" element={<ProtectedRoute><ReportsPage mode="member" /></ProtectedRoute>} />
        <Route path="/reports/pending-dues" element={<ProtectedRoute><ReportsPage mode="pending" /></ProtectedRoute>} />
        <Route path="/reports/event-financials" element={<Navigate to="/reports/event-collection-audit" replace />} />
        <Route path="/reports/payment-modes" element={<Navigate to="/reports/event-collection-audit" replace />} />
        <Route path="/reports/member-category-paid" element={<Navigate to="/reports/pending-dues" replace />} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/contribution-calculation" element={<ProtectedRoute><ContributionCalculationPage /></ProtectedRoute>} />
        <Route path="/exit-process" element={<ProtectedRoute><ExitProcessPage /></ProtectedRoute>} />
        <Route path="/user-rights" element={<ProtectedRoute><UserRightsPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
