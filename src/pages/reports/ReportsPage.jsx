import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import apiClient from "../../services/apiClient";
import { exportSheets } from "../../utils/exportToExcel";
import AppDataTable from "../../components/common/AppDataTable";
import AppSelect from "../../components/common/AppSelect";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import { GetMembers } from "../../services/memberService";
import { GetContributions } from "../../services/contributionService";

export default function ReportsPage({ mode }) {
  const { authState } = useAuth();
  const hasWriteAccess = getRightsForPage("Reports", authState?.role).write;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: dayjs().month() + 1, year: dayjs().year() });

  // Member Category Report state
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [allContributions, setAllContributions] = useState([]);

  useEffect(() => {
    if (mode === "member-category") {
      async function loadMemberCategoryData() {
        setLoading(true);
        try {
          const membersList = await GetMembers();
          setMembers(membersList);
          if (membersList.length > 0) {
            setSelectedMemberId(membersList[0].memberId);
          }
          const contributionsList = await GetContributions();
          setAllContributions(contributionsList);
        } catch (error) {
          console.error("Failed to load member category report data:", error);
        } finally {
          setLoading(false);
        }
      }
      loadMemberCategoryData();
    } else {
      async function loadReports() {
        setLoading(true);
        try {
          const { data } = await apiClient.get("/reports/summary", { params: filters });
          setReport(data);
        } catch (error) {
          console.error("Failed to load summary reports:", error);
        } finally {
          setLoading(false);
        }
      }
      loadReports();
    }
  }, [filters, mode]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ 
    label: dayjs().month(i).format("MMMM"), 
    value: i + 1 
  }));

  const eventColumns = [
    { label: "Event",    key: "eventName",    render: (row) => <Typography variant="body2" fontWeight={700}>{row.eventName}</Typography> },
    { label: "Date",     key: "eventDate",    render: (row) => dayjs(row.eventDate).format("DD MMM YYYY") },
    { label: "Expected", key: "expectedAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={700}>₹{row.expectedAmount}</Typography> },
    { label: "Paid",     key: "paidAmount",    align: "right", render: (row) => <Typography variant="body2" fontWeight={700} color="success.main">₹{row.paidAmount}</Typography> },
    { label: "Pending",  key: "pendingAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={700} color="error.main">₹{row.pendingAmount}</Typography> },
  ];

  const memberColumns = [
    { label: "Member",   key: "memberName",          render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    { label: "Expected", key: "totalExpectedAmount",  align: "right", render: (row) => `₹${row.totalExpectedAmount}` },
    { label: "Paid",     key: "totalPaidAmount",      align: "right", render: (row) => <Typography variant="body2" fontWeight={700} color="success.main">₹{row.totalPaidAmount}</Typography> },
  ];

  const pendingColumns = [
    { label: "Member",  key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    { label: "Event",   key: "eventName" },
    { label: "Amount",  key: "amount",    align: "right", render: (row) => <Typography variant="body2" fontWeight={700} color="error.main">₹{row.amount}</Typography> },
  ];

  // Grouped category paid amounts for the selected member
  const memberCategoryData = useMemo(() => {
    if (!selectedMemberId || allContributions.length === 0) return [];

    // Filter contributions for selected member and status "Paid"
    const memberPaidContribs = allContributions.filter(
      c => c.memberId === selectedMemberId && c.paymentStatus === "Paid"
    );

    // Group by categoryName
    const groups = {};
    memberPaidContribs.forEach(c => {
      const category = c.categoryName || "Uncategorized";
      groups[category] = (groups[category] || 0) + c.amount;
    });

    // Convert to table rows
    return Object.entries(groups).map(([category, amount]) => ({
      categoryName: category,
      totalPaidAmount: amount
    }));
  }, [selectedMemberId, allContributions]);

  const memberCategoryColumns = [
    { label: "Category",         key: "categoryName",    render: (row) => <Typography variant="body2" fontWeight={700}>{row.categoryName}</Typography> },
    { label: "Total Paid",  key: "totalPaidAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={700} color="success.main">₹{row.totalPaidAmount}</Typography> }
  ];

  return (
    <div className="page-shell">
      <Card sx={{ border: "none", boxShadow: "0 2px 8px rgba(74,63,107,0.1)", borderRadius: "6px", overflow: "hidden" }}>
        <Box sx={{
          background: "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
          color: "#ffffff",
          px: 2.5,
          py: 0.5,
          minHeight: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#ffffff", fontSize: "0.85rem" }}>
            {mode === "event" && "Event-wise Collection Audit"}
            {mode === "member" && "Member Contribution Velocity"}
            {mode === "pending" && "High Priority Dues (Pending Receipt)"}
            {mode === "member-category" && "Member Category-wise Paid Analysis"}
            {!mode && "Financial Analytics"}
          </Typography>
          <AppButton
            size="small"
            variant="contained"
            disabled={!hasWriteAccess}
            sx={{ 
              bgcolor: "#2a1b4d", 
              borderRadius: "3px", 
              fontSize: "0.75rem", 
              py: 0.3, 
              px: 2, 
              "&:hover": { bgcolor: "#1a1033" },
              ...( !hasWriteAccess ? { bgcolor: "#cbd5e1 !important", color: "#94a3b8 !important" } : {} )
            }}
            onClick={() => {
              if (!hasWriteAccess) return;
              if (mode === "member-category") {
                const activeMember = members.find(m => m.memberId === selectedMemberId);
                const memberName = activeMember ? activeMember.name : "Member";
                exportSheets(`${memberName}-category-payments.xlsx`, [
                  { 
                    name: "Category Payments", 
                    data: memberCategoryData.map((d, i) => ({ 
                      "S.No": i + 1, 
                      "Category": d.categoryName, 
                      "Total Paid (₹)": d.totalPaidAmount 
                    })) 
                  }
                ]);
              } else {
                exportSheets("team-contribution-reports.xlsx", [
                  { name: "Event Collections", data: report?.eventCollections ?? [] },
                  { name: "Member History", data: report?.memberContributionHistory ?? [] },
                  { name: "Pending Dues", data: report?.pendingDues ?? [] },
                ]);
              }
            }}
          >
            Export Excel
          </AppButton>
        </Box>

        <CardContent sx={{ p: 0 }}>
          <Box sx={{ bgcolor: "#faf9fd", p: 2, borderBottom: "1px solid rgba(74,63,107,0.1)" }}>
            <Grid container spacing={3} alignItems="center">
              {mode === "member-category" ? (
                <Grid size={{ xs: 12, md: 4 }}>
                  <AppSelect
                    label="Select Member"
                    value={selectedMemberId}
                    onChange={(event) => setSelectedMemberId(event.target.value)}
                    options={members.map(m => ({ label: m.name, value: m.memberId }))}
                  />
                </Grid>
              ) : (
                <>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <AppSelect
                      label="Month"
                      value={filters.month}
                      onChange={(event) => setFilters((current) => ({ ...current, month: Number(event.target.value) }))}
                      options={monthOptions}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <AppInput
                      label="Year"
                      type="number"
                      value={filters.year}
                      onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Typography variant="caption" color="text.secondary">Collection Health Index</Typography>
                     <Typography variant="body2" fontWeight={800}>
                        ₹{report?.eventCollections?.reduce((s, r) => s + r.paidAmount, 0)} Realized / ₹{report?.eventCollections?.reduce((s, r) => s + r.expectedAmount, 0)} Projected
                     </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>

          <Box sx={{ p: 4 }}>
            <Grid container spacing={3}>
              {(!mode || mode === "event") && (
                <Grid size={{ xs: 12 }}>
                  <AppDataTable
                    title="Event-wise Collection Audit"
                    columns={eventColumns}
                    data={report?.eventCollections ?? []}
                    loading={loading}
                  />
                </Grid>
              )}
              
              {(!mode || mode === "member") && (
                <Grid size={{ xs: 12 }}>
                  <AppDataTable
                    title="Member Contribution Velocity"
                    columns={memberColumns}
                    data={report?.memberContributionHistory ?? []}
                    loading={loading}
                  />
                </Grid>
              )}

              {(!mode || mode === "pending") && (
                <Grid size={{ xs: 12 }}>
                  <AppDataTable
                    title="High Priority Dues (Pending Receipt)"
                    columns={pendingColumns}
                    data={report?.pendingDues ?? []}
                    loading={loading}
                  />
                </Grid>
              )}

              {mode === "member-category" && (
                <Grid size={{ xs: 12 }}>
                  <AppDataTable
                    title="Category-wise Overall Paid Amount"
                    columns={memberCategoryColumns}
                    data={memberCategoryData}
                    loading={loading}
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
}
