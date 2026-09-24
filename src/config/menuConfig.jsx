import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Diversity3RoundedIcon from "@mui/icons-material/Diversity3Rounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import RuleRoundedIcon from "@mui/icons-material/RuleRounded";

export const navigationItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: <DashboardRoundedIcon fontSize="small" />
  },
  {
    label: "Members",
    path: "/members",
    icon: <Diversity3RoundedIcon fontSize="small" />
  },
  {
    label: "Events",
    id: "events",
    icon: <EventRoundedIcon fontSize="small" />,
    children: [
      { label: "Event", path: "/events", icon: <EventRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Calendar", path: "/calendar", icon: <CalendarMonthRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Gallery", path: "/gallery", icon: <CollectionsRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  {
    label: "Finance",
    id: "finance",
    icon: <AccountBalanceRoundedIcon fontSize="small" />,
    children: [
      { label: "Contribution", path: "/contributions", icon: <SavingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Payment History", path: "/payments", icon: <ReceiptLongRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Calculation", path: "/contribution-calculation", icon: <CalculateRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Expense", path: "/expense", icon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  {
    label: "Support Ticket",
    path: "/support-tickets",
    icon: <ConfirmationNumberRoundedIcon fontSize="small" />
  },
  {
    label: "Tools",
    id: "tools",
    icon: <BuildRoundedIcon fontSize="small" />,
    children: [
      { label: "Roles", path: "/roles", icon: <BadgeRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Event Types", path: "/event-types", icon: <CategoryRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Exit Process", path: "/exit-process", icon: <PersonRemoveRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "User Rights", path: "/user-rights", icon: <AdminPanelSettingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Users", path: "/users", icon: <ManageAccountsRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Budget Calculations", path: "/budget-calculations", icon: <CalculateRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Types", path: "/types", icon: <CategoryRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Status", path: "/status", icon: <RuleRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Settings", path: "/settings", icon: <SettingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  {
    label: "Reports",
    path: "/reports",
    icon: <AssessmentRoundedIcon fontSize="small" />
  },
];

