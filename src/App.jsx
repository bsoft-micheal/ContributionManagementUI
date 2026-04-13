import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import CalendarPage from "./pages/CalendarPage";
import ContributionsPage from "./pages/ContributionsPage";
import DashboardPage from "./pages/DashboardPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import EventTypesPage from "./pages/EventTypesPage";
import EventsPage from "./pages/EventsPage";
import LoginPage from "./pages/LoginPage";
import MembersPage from "./pages/MembersPage";
import ReportsPage from "./pages/ReportsPage";
import ContributionCalculationPage from "./pages/ContributionCalculationPage";
import ExitProcessPage from "./pages/ExitProcessPage";

export default function App() {
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
        <Route path="/members" element={<ProtectedRoute roles={["Admin"]}><MembersPage /></ProtectedRoute>} />
        <Route path="/event-types" element={<ProtectedRoute roles={["Admin"]}><EventTypesPage /></ProtectedRoute>} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/contributions" element={<ContributionsPage />} />
        <Route path="/reports" element={<ProtectedRoute roles={["Admin"]}><ReportsPage /></ProtectedRoute>} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/contribution-calculation" element={<ProtectedRoute roles={["Admin"]}><ContributionCalculationPage /></ProtectedRoute>} />
        <Route path="/exit-process" element={<ProtectedRoute roles={["Admin"]}><ExitProcessPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
