import React, { createContext, useContext, useState, useEffect } from "react";

const NotificationContext = createContext(null);

const STORAGE_KEY = "app_notifications_v1";

const DEFAULT_NOTIFICATIONS = [
  {
    id: "notif-101",
    type: "TICKET_RAISED",
    title: "New Support Ticket Raised",
    message: "Member Rahul Sharma raised a Support Ticket (#TKT-2026-004) regarding Payment Transaction #TXN-2026-008 (Pending).",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    isRead: false,
    targetRole: "Authority",
    link: "/support-tickets",
    ticketNo: "TKT-2026-004",
  },
  {
    id: "notif-102",
    type: "PAYMENT_PENDING",
    title: "Pending Payment Verification",
    message: "Payment of ₹1,500 by Priya Patel is pending admin verification.",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    isRead: false,
    targetRole: "Authority",
    link: "/payments",
  },
  {
    id: "notif-103",
    type: "TICKET_RESOLVED",
    title: "Support Ticket Resolved",
    message: "Support ticket #TKT-2026-002 was marked as Resolved.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    isRead: true,
    targetRole: "All",
    link: "/support-tickets",
  }
];

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // Ignore storage errors
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const addNotification = (notif) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      targetRole: "Authority",
      link: "/support-tickets",
      ...notif,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
