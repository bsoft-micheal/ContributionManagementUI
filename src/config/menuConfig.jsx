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

import { MENU_FEATURE_IDS } from "../constants";

export const navigationItems = [
  {
    featureId: MENU_FEATURE_IDS.DASHBOARD,
    label: "Dashboard",
    path: "/",
    icon: <DashboardRoundedIcon fontSize="small" />
  },
  {
    featureId: MENU_FEATURE_IDS.USERS_MODULE,
    label: "Users",
    path: "/users",
    icon: <ManageAccountsRoundedIcon fontSize="small" />
  },
  {
    featureId: MENU_FEATURE_IDS.EVENTS_MODULE,
    label: "Events",
    id: "events",
    icon: <EventRoundedIcon fontSize="small" />,
    children: [
      { featureId: MENU_FEATURE_IDS.EVENT_PAGE, label: "Event", path: "/events", icon: <EventRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.CALENDAR, label: "Calendar", path: "/calendar", icon: <CalendarMonthRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.GALLERY, label: "Gallery", path: "/gallery", icon: <CollectionsRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  {
    featureId: MENU_FEATURE_IDS.FINANCE_MODULE,
    label: "Finance",
    id: "finance",
    icon: <AccountBalanceRoundedIcon fontSize="small" />,
    children: [
      { featureId: MENU_FEATURE_IDS.CONTRIBUTION, label: "Contribution", path: "/contributions", icon: <SavingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.PAYMENT_HISTORY, label: "Payment History", path: "/payments", icon: <ReceiptLongRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.CALCULATION, label: "Calculation", path: "/contribution-calculation", icon: <CalculateRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.EXPENSE, label: "Expense", path: "/expense", icon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  {
    featureId: MENU_FEATURE_IDS.SUPPORT_TICKET,
    label: "Support Ticket",
    path: "/support-tickets",
    icon: <ConfirmationNumberRoundedIcon fontSize="small" />
  },
  {
    featureId: MENU_FEATURE_IDS.TOOLS_MODULE,
    label: "Tools",
    id: "tools",
    icon: <BuildRoundedIcon fontSize="small" />,
    children: [
      { featureId: MENU_FEATURE_IDS.ROLES, label: "Roles", path: "/roles", icon: <BadgeRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.USER_RIGHTS, label: "User Rights", path: "/user-rights", icon: <AdminPanelSettingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.EVENT_TYPES, label: "Event Types", path: "/event-types", icon: <CategoryRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.BUDGET_CALCULATION, label: "Budget Calculations", path: "/budget-calculations", icon: <CalculateRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.TYPES, label: "Types", path: "/types", icon: <CategoryRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.STATUS, label: "Status", path: "/status", icon: <RuleRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.EXIT_PROCESS, label: "Exit Process", path: "/exit-process", icon: <PersonRemoveRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { featureId: MENU_FEATURE_IDS.SETTINGS, label: "Settings", path: "/settings", icon: <SettingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  {
    featureId: MENU_FEATURE_IDS.REPORTS,
    label: "Reports",
    path: "/reports",
    icon: <AssessmentRoundedIcon fontSize="small" />
  },
];

