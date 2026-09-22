import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Stack,
  Chip
} from "@mui/material";
import ComputerIcon from "@mui/icons-material/Computer";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import LogoutIcon from "@mui/icons-material/Logout";
import apiClient from "../../services/apiClient";
import { useAppToast } from "../../components/common/AppToast";
import dayjs from "dayjs";

export default function SessionHistoryPage() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useAppToast();
  const currentDeviceId = localStorage.getItem("deviceId");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [activeRes, historyRes] = await Promise.all([
        apiClient.get("/device-info/active"),
        apiClient.get("/device-info/history")
      ]);
      setActiveSessions(activeRes.data);
      setLoginHistory(historyRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load session data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogoutSession = async (historyId) => {
    try {
      await apiClient.delete(`/device-info/${historyId}`);
      toast.success("Session logged out successfully.");
      fetchData(); // Refresh the lists
    } catch (error) {
      console.error(error);
      toast.error("Failed to logout session.");
    }
  };

  const renderDeviceIcon = (deviceType) => {
    return deviceType === 2 ? <PhoneIphoneIcon /> : <ComputerIcon />;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, margin: "0 auto" }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        Device & Session Management
      </Typography>

      {/* Active Sessions Section */}
      <Card sx={{ mb: 4, borderRadius: 2, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "600" }}>
            Currently Active Sessions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            These are the devices that are currently logged into your account.
          </Typography>

          <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider" }}>
            <Table>
              <TableHead sx={{ backgroundColor: "action.hover" }}>
                <TableRow>
                  <TableCell>Device</TableCell>
                  <TableCell>System / OS</TableCell>
                  <TableCell>Browser / App</TableCell>
                  <TableCell>Last Seen</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No active sessions found.</TableCell>
                  </TableRow>
                ) : (
                  activeSessions.map((session) => {
                    const isCurrentDevice = session.deviceId === currentDeviceId;
                    
                    // We need the historyId to logout. We will use the history list to find the active history ID for this device.
                    // Or if backend returns historyId directly in activeSessions, use that.
                    // Since backend returns DeviceDetail for GetActiveSessionsAsync, it doesn't have historyId.
                    // Let's find the corresponding active history record from the loginHistory array.
                    const activeHistoryRecord = loginHistory.find(h => h.deviceDetailId === session.deviceDetailId && h.isActive);

                    return (
                      <TableRow key={session.deviceDetailId} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {renderDeviceIcon(session.deviceType)}
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {session.deviceName} {session.brand !== "Unknown" ? `(${session.brand})` : ""}
                              </Typography>
                              {isCurrentDevice && (
                                <Chip label="Current Device" color="primary" size="small" sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }} />
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{session.os}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{session.browser}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{dayjs(session.lastSeenAt).format("MMM DD, YYYY HH:mm")}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {!isCurrentDevice && activeHistoryRecord && (
                            <Button 
                              variant="outlined" 
                              color="error" 
                              size="small"
                              startIcon={<LogoutIcon />}
                              onClick={() => handleLogoutSession(activeHistoryRecord.historyId)}
                            >
                              Logout
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Login History Section */}
      <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "600" }}>
            Login History
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            A record of all past login sessions on your account.
          </Typography>

          <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider" }}>
            <Table>
              <TableHead sx={{ backgroundColor: "action.hover" }}>
                <TableRow>
                  <TableCell>Device</TableCell>
                  <TableCell>Login Time</TableCell>
                  <TableCell>Logout Time</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loginHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">No login history found.</TableCell>
                  </TableRow>
                ) : (
                  loginHistory.map((history) => (
                    <TableRow key={history.historyId} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {renderDeviceIcon(history.deviceDetail?.deviceType)}
                          <Typography variant="body2">
                            {history.deviceDetail?.deviceName || "Unknown Device"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{dayjs(history.loginTime).format("MMM DD, YYYY HH:mm")}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {history.logoutTime ? dayjs(history.logoutTime).format("MMM DD, YYYY HH:mm") : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {history.isActive ? (
                          <Chip label="Active" color="success" size="small" />
                        ) : (
                          <Chip label="Logged Out" color="default" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
