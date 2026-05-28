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

export const navigationItems = [
  { label: "Dashboard",                 path: "/",              icon: <DashboardRoundedIcon fontSize="small" /> },
  { label: "Members",                   path: "/members",       icon: <Diversity3RoundedIcon fontSize="small" /> },
  { label: "Events",                    path: "/events",        icon: <EventRoundedIcon fontSize="small" /> },
  { label: "Contributions",             path: "/contributions", icon: <SavingsRoundedIcon fontSize="small" /> },
  { label: "Calculation",               path: "/contribution-calculation", icon: <CalculateRoundedIcon fontSize="small" /> },
  { label: "Calendar",                  path: "/calendar",      icon: <CalendarMonthRoundedIcon fontSize="small" /> },
  { 
    label: "Support Data",
    id: "master",
    icon: <SettingsSuggestRoundedIcon fontSize="small" />,
    children: [
      { label: "Event Types",             path: "/event-types",  icon: <CategoryRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "Exit Process",            path: "/exit-process", icon: <PersonRemoveRoundedIcon sx={{ fontSize: "1rem" }} /> },
      { label: "User Rights",             path: "/user-rights",  icon: <AdminPanelSettingsRoundedIcon sx={{ fontSize: "1rem" }} /> },
    ]
  },
  { label: "Reports",                   path: "/reports",       icon: <AssessmentRoundedIcon fontSize="small" /> },
];
