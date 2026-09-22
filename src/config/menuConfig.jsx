import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Diversity3RoundedIcon from "@mui/icons-material/Diversity3Rounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import SettingsSuggestRoundedIcon from "@mui/icons-material/SettingsSuggestRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";

export const navigationItems = [
  { label: "Dashboard", path: "/", icon: <DashboardRoundedIcon fontSize="small" /> },
  { label: "Members", path: "/members", icon: <Diversity3RoundedIcon fontSize="small" /> },
  { label: "Events", path: "/events", icon: <EventRoundedIcon fontSize="small" /> },
  { label: "Contributions", path: "/contributions", icon: <SavingsRoundedIcon fontSize="small" /> },
  { label: "Payments", path: "/payments", icon: <ReceiptLongRoundedIcon fontSize="small" /> },
  { label: "Expense", path: "/expense", icon: <AccountBalanceWalletRoundedIcon fontSize="small" /> },
  { label: "Calculation", path: "/contribution-calculation", icon: <CalculateRoundedIcon fontSize="small" /> },
  { label: "Calendar", path: "/calendar", icon: <CalendarMonthRoundedIcon fontSize="small" /> },
  { label: "Gallery", path: "/gallery", icon: <CollectionsRoundedIcon fontSize="small" /> },
  { label: "Support Tickets", path: "/support-tickets", icon: <ConfirmationNumberRoundedIcon fontSize="small" /> },
  {
    label: "Support Data",
    id: "master",
    icon: <SettingsSuggestRoundedIcon fontSize="small" />,
    children: [
      { label: "Roles", path: "/roles", icon: <BadgeRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Event Types", path: "/event-types", icon: <CategoryRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Exit Process", path: "/exit-process", icon: <PersonRemoveRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "User Rights", path: "/user-rights", icon: <AdminPanelSettingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Users", path: "/users", icon: <ManageAccountsRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  {
    label: "Reports",
    id: "reports",
    icon: <AssessmentRoundedIcon fontSize="small" />,
    children: [
      { label: "Event Audit", path: "/reports/event-collection-audit", icon: <EventNoteRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Member Velocity", path: "/reports/member-velocity", icon: <TrendingUpRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Pending Dues", path: "/reports/pending-dues", icon: <PriorityHighRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Member Category Paid", path: "/reports/member-category-paid", icon: <SavingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "My Contributions", path: "/my-contributions", icon: <LeaderboardRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  { label: "Settings", path: "/settings", icon: <SettingsRoundedIcon fontSize="small" /> },
];
