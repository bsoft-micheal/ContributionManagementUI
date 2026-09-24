import React, { useEffect, useState } from "react";
import { Box, Grid, Typography, Chip, Tooltip, IconButton, Avatar } from "@mui/material";
import { ExitToApp as ExitIcon, CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import { formatGridDate } from "../../utils/dateHelper";
import { GetMembersAsync, UpdateMemberAsync } from "../../services/memberService";
import { GetContributionsAsync } from "../../services/contributionService";
import { GetEventsAsync } from "../../services/eventService";
import AppDataTable from "../../components/common/AppDataTable";
import AppButton from "../../components/common/AppButton";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";

export default function ExitProcessPage() {
  const { authState } = useAuth();
  const hasWriteAccess = getRightsForPage("Exit Process", authState?.role).write;

  const [exitCandidates, setExitCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useAppToast();

  useEffect(() => {
    loadExitData();
  }, []);

  async function loadExitData() {
    setLoading(true);
    try {
      const [members, contributions, events] = await Promise.all([
        GetMembersAsync(),
        GetContributionsAsync(),
        GetEventsAsync()
      ]);

      // Identify farewell events
      const farewellEvents = events.filter(e => e.eventName.toLowerCase().includes("farewell"));
      const farewellEventIds = farewellEvents.map(e => e.eventId);

      // Members who were in a farewell event
      const candidates = members.filter(member => {
        // Assume active members only
        if (member.isExited) return false;

        const hasFarewell = farewellEvents.some(
          e => e.participantIds?.includes(member.memberId) ||
               e.participants?.some(p => p.memberId === member.memberId || p.id === member.memberId)
        );
        return hasFarewell;
      }).map(member => {
        // Calculate pending dues
        const memberContributions = contributions.filter(c => c.memberId === member.memberId);
        const pendingAmount = memberContributions
          .filter(c => c.paymentStatus !== "Paid")
          .reduce((sum, c) => sum + (c.amount || 0), 0);
        
        return {
          ...member,
          pendingAmount,
          contributionCount: memberContributions.length,
          pendingCount: memberContributions.filter(c => c.paymentStatus !== "Paid").length
        };
      });

      setExitCandidates(candidates);
    } catch (error) {
      console.error("Failed to load", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalExit(member) {
    if (!hasWriteAccess) {
    
      return;
    }
    if (member.pendingAmount > 0) {
      if (!window.confirm(`Member has ₹${member.pendingAmount} in outstanding dues. Proceed with exit anyway?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Process final exit for ${member.name}?`)) return;
    }

    try {
      await UpdateMemberAsync(member.memberId, { ...member, isExited: true, isActive: false });
      toast.success("Saved successfully");
      loadExitData();
    } catch (error) {
      toast.error("Failed to save");
    }
  }

  const columns = [
    {
      label: "Profile",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "#4a3f6b", fontSize: "0.8rem" }}>
            {row.name[0]}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={800}>{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">{row.roleName}</Typography>
          </Box>
        </Box>
      )
    },
    { label: "Joining Date", key: "joiningDate", render: (row) => formatGridDate(row.joiningDate) },
    { 
      label: "Outstanding Dues", 
      key: "pendingAmount", 
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={900} color={row.pendingAmount > 0 ? "error.main" : "success.main"}>
          ₹{row.pendingAmount}
        </Typography>
      )
    },
    {
      label: "Pending Events",
      key: "pendingCount",
      align: "center",
      render: (row) => (
        <Chip 
          label={`${row.pendingCount} Pending`} 
          size="small" 
          color={row.pendingCount > 0 ? "warning" : "default"}
          sx={{ fontWeight: 700, fontSize: "0.65rem" }}
        />
      )
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.CreatedAt || row.createdOn || row.CreatedOn),
    },
    {
      label: "Final Action",
      align: "center",
      render: (row) => (
        <AppButton
          size="small"
          variant="contained"
          color="error"
          disabled={!hasWriteAccess}
          startIcon={<ExitIcon sx={{ fontSize: "1rem" }} />}
          onClick={() => handleFinalExit(row)}
          sx={{ 
            fontSize: "0.7rem", 
            py: 0.5,
            ...( !hasWriteAccess ? { bgcolor: "#cbd5e1 !important", color: "#94a3b8 !important" } : {} )
          }}
        >
          Process Exit
        </AppButton>
      )
    }
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Member Exit Clearance"
        columns={columns}
        data={exitCandidates}
        loading={loading}
        filterPanel={
          <Box sx={{ p: 1.5, bgcolor: "rgba(220, 38, 38, 0.05)", borderRadius: "8px", border: "1px solid rgba(220, 38, 38, 0.1)" }}>
            <Typography variant="caption" fontWeight={800} color="error.main" sx={{ display: "block", mb: 0.5 }}>
              Exit Protocol Notice
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
              This portal identifies members who have completed their Farewell event. Ensure all outstanding dues (red) are settled or acknowledged before final archival.
            </Typography>
          </Box>
        }
      />
    </div>
  );
}
