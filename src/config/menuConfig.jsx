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
    featureId: 1,
    label: "Dashboard",
    path: "/",
    icon: <DashboardRoundedIcon fontSize="small" />
  },
  {
    featureId: 2,
    label: "Members",
    path: "/members",
    icon: <Diversity3RoundedIcon fontSize="small" />
  },
  {
    featureId: 3,
    label: "Events",
    id: "events",
    icon: <EventRoundedIcon fontSize="small" />,
    children: [
      { featureId: 4, label: "Event", path: "/events", icon: <EventRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 5, label: "Calendar", path: "/calendar", icon: <CalendarMonthRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 6, label: "Gallery", path: "/gallery", icon: <CollectionsRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  {
    featureId: 7,
    label: "Finance",
    id: "finance",
    icon: <AccountBalanceRoundedIcon fontSize="small" />,
    children: [
      { featureId: 8, label: "Contribution", path: "/contributions", icon: <SavingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 9, label: "Payment History", path: "/payments", icon: <ReceiptLongRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 10, label: "Calculation", path: "/contribution-calculation", icon: <CalculateRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 11, label: "Expense", path: "/expense", icon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  {
    featureId: 12,
    label: "Support Ticket",
    path: "/support-tickets",
    icon: <ConfirmationNumberRoundedIcon fontSize="small" />
  },
  {
    featureId: 13,
    label: "Tools",
    id: "tools",
    icon: <BuildRoundedIcon fontSize="small" />,
    children: [
      { featureId: 14, label: "Users", path: "/users", icon: <ManageAccountsRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 15, label: "Roles", path: "/roles", icon: <BadgeRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 16, label: "User Rights", path: "/user-rights", icon: <AdminPanelSettingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 17, label: "Event Types", path: "/event-types", icon: <CategoryRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 18, label: "Budget Calculations", path: "/budget-calculations", icon: <CalculateRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 19, label: "Types", path: "/types", icon: <CategoryRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 20, label: "Status", path: "/status", icon: <RuleRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 21, label: "Exit Process", path: "/exit-process", icon: <PersonRemoveRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: 22, label: "Settings", path: "/settings", icon: <SettingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  {
    featureId: 23,
    label: "Reports",
    path: "/reports",
    icon: <AssessmentRoundedIcon fontSize="small" />
  },
];

