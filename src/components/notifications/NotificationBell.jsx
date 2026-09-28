import React, { useState } from "react";
import {
  Badge,
  Box,
  IconButton,
  Popover,
  Typography,
  Stack,
  Button,
  Divider,
  Chip,
  List,
  ListItem,
  Avatar,
  Tooltip,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  ConfirmationNumber as TicketIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  InfoOutlined as InfoIcon,
  DoneAll as DoneAllIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../contexts/NotificationContext";

dayjs.extend(relativeTime);

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [anchorEl, setAnchorEl] = useState(null);
  const [filterTab, setFilterTab] = useState("ALL"); // ALL or UNREAD
  const navigate = useNavigate();

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const displayedNotifications = notifications.filter((n) => {
    if (filterTab === "UNREAD") return !n.isRead;
    return true;
  });

  const getNotifIcon = (type) => {
    switch (type) {
      case "TICKET_RAISED":
        return <TicketIcon sx={{ color: "#ef4444", fontSize: "1.1rem" }} />;
      case "TICKET_RESOLVED":
        return <CheckCircleIcon sx={{ color: "#10b981", fontSize: "1.1rem" }} />;
      case "PAYMENT_PENDING":
        return <PaymentIcon sx={{ color: "#f59e0b", fontSize: "1.1rem" }} />;
      default:
        return <InfoIcon sx={{ color: "#3b82f6", fontSize: "1.1rem" }} />;
    }
  };

  const handleNotifClick = (notif) => {
    markAsRead(notif.id);
    handleClose();
    if (notif.link) {
      navigate(notif.link, { state: { ticketNo: notif.ticketNo, notifId: notif.id } });
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleOpen}
          sx={{
            color: "#c4bde0",
            p: 1,
            borderRadius: "8px",
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.08)",
              color: "#ffffff",
            },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              "& .MuiBadge-badge": {
                bgcolor: "#ef4444",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "0.68rem",
                height: 18,
                minWidth: 18,
                boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
              },
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsIcon sx={{ fontSize: "1.25rem", color: "#fca5a5" }} />
            ) : (
              <NotificationsNoneIcon sx={{ fontSize: "1.25rem" }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480,
            borderRadius: "14px",
            bgcolor: (t) => (t.palette.mode === "dark" ? "#1a2035" : "#ffffff"),
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.25), 0 0 1px rgba(255, 255, 255, 0.1)",
            border: (t) => `1px solid ${t.palette.divider}`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1.5, bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc") }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ fontSize: "0.95rem" }}>
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  label={`${unreadCount} new`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(239, 68, 68, 0.15)",
                    color: "#ef4444",
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    height: 20,
                  }}
                />
              )}
            </Stack>

            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<DoneAllIcon sx={{ fontSize: "0.85rem !important" }} />}
                onClick={markAllAsRead}
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#6366f1",
                  textTransform: "none",
                  p: "2px 6px",
                  "&:hover": { bgcolor: "rgba(99, 102, 241, 0.08)" },
                }}
              >
                Mark all read
              </Button>
            )}
          </Stack>

          {/* Filter Tabs */}
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Chip
              label="All"
              clickable
              onClick={() => setFilterTab("ALL")}
              sx={{
                height: 24,
                fontSize: "0.72rem",
                fontWeight: 700,
                bgcolor: filterTab === "ALL" ? "#4a3f6b" : "transparent",
                color: filterTab === "ALL" ? "#ffffff" : "text.secondary",
                border: "1px solid",
                borderColor: filterTab === "ALL" ? "#4a3f6b" : "divider",
              }}
            />
            <Chip
              label={`Unread (${unreadCount})`}
              clickable
              onClick={() => setFilterTab("UNREAD")}
              sx={{
                height: 24,
                fontSize: "0.72rem",
                fontWeight: 700,
                bgcolor: filterTab === "UNREAD" ? "#4a3f6b" : "transparent",
                color: filterTab === "UNREAD" ? "#ffffff" : "text.secondary",
                border: "1px solid",
                borderColor: filterTab === "UNREAD" ? "#4a3f6b" : "divider",
              }}
            />
          </Stack>
        </Box>

        <Divider />

        {/* Notifications List */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 1 }}>
          {displayedNotifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <NotificationsNoneIcon sx={{ fontSize: "2.5rem", color: "text.disabled", mb: 1 }} />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                No notifications found
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {displayedNotifications.map((notif) => (
                <ListItem
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  sx={{
                    borderRadius: "10px",
                    mb: 0.8,
                    p: 1.2,
                    cursor: "pointer",
                    bgcolor: (t) =>
                      !notif.isRead
                        ? t.palette.mode === "dark"
                          ? "rgba(99, 102, 241, 0.12)"
                          : "rgba(99, 102, 241, 0.05)"
                        : "transparent",
                    transition: "all 0.15s ease",
                    borderLeft: !notif.isRead ? "3px solid #6366f1" : "3px solid transparent",
                    "&:hover": {
                      bgcolor: (t) =>
                        t.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.06)"
                          : "rgba(0, 0, 0, 0.03)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ width: "100%" }}>
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: (t) =>
                          t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                        mt: 0.2,
                      }}
                    >
                      {getNotifIcon(notif.type)}
                    </Avatar>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={notif.isRead ? 600 : 800}
                          sx={{ fontSize: "0.82rem", lineHeight: 1.2 }}
                          noWrap
                        >
                          {notif.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: "0.68rem", color: "text.disabled", flexShrink: 0 }}
                        >
                          {dayjs(notif.timestamp).fromNow()}
                        </Typography>
                      </Stack>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: "0.75rem",
                          mt: 0.4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.3,
                        }}
                      >
                        {notif.message}
                      </Typography>

                      {notif.link && (
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.3}
                          sx={{ mt: 0.8, color: "#6366f1" }}
                        >
                          <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.7rem" }}>
                            View details
                          </Typography>
                          <ChevronRightIcon sx={{ fontSize: "0.85rem" }} />
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
