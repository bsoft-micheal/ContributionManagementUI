import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  Button,
  Avatar,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import {
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Search as SearchIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { formatViewDate } from "../../utils/dateHelper";
import { formatWholeCurrency, roundToWhole } from "../../utils/roundingHelper";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import AppConfirmDialog from "../common/AppConfirmDialog";
import { useAppToast } from "../common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { hasActionPermission } from "../../utils/rightsHelper";
import { deleteEventAsync, getEventByIdAsync } from "../../services/eventService";
import { getContributionsByEventAsync } from "../../services/contributionService";
import { getMembersAsync } from "../../services/memberService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { COMMON_STRINGS, TOAST_MESSAGES } from "../../constants";

export default function EventDetailsDialog({ open, onClose, event, members = [], eventTypes = [], onDeleteSuccess }) {
  const navigate = useNavigate();
  const toast = useAppToast();
  const { authState } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [memberViewTab, setMemberViewTab] = useState("split");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [internalMembers, setInternalMembers] = useState([]);
  const [internalEventTypes, setInternalEventTypes] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailedEvent, setDetailedEvent] = useState(null);

  useEffect(() => {
    if (open && (!eventTypes || eventTypes.length === 0)) {
      getEventTypesAsync()
        .then((res) => {
          if (Array.isArray(res)) setInternalEventTypes(res);
        })
        .catch(() => {});
    }
  }, [open, eventTypes]);

  useEffect(() => {
    if (open && event?.eventId) {
      getEventByIdAsync(event.eventId)
        .then((res) => {
          if (res) setDetailedEvent(res);
        })
        .catch(() => {});
    } else {
      setDetailedEvent(null);
    }
  }, [open, event?.eventId]);

  const activeEvent = detailedEvent || event;

  const canDeleteEvent = Boolean(
    hasActionPermission("Delete Event", 33, authState?.role).canExecute ||
    authState?.role?.toLowerCase() === "admin" ||
    authState?.role?.toLowerCase() === "organizer"
  );

  const handleConfirmDelete = async () => {
    if (!event?.eventId) return;
    const hasPaid = Boolean(
      event.hasPaidContributions ||
      Number(event.paidContributionsCount || 0) > 0 ||
      Number(event.totalPaidAmount || event.collectedAmount || 0) > 0 ||
      (contributions || []).some((c) => {
        const pStatus = String(c.paymentStatus || "").toLowerCase();
        const sName = String(c.statusName || c.status || "").toLowerCase();
        const hasCash = Number(c.cashAmount || 0) > 0;
        const hasUpi = Number(c.upiAmount || 0) > 0;
        const hasPaidAmt = Number(c.paidAmount || c.amountPaid || 0) > 0;
        const hasPaymentDate = Boolean(c.paymentDate);
        const isPaidStatus = pStatus === "paid" || Number(c.paymentStatus) === 2 || ["paid", "verified", "closed", "completed"].includes(sName);
        return hasCash || hasUpi || hasPaidAmt || hasPaymentDate || isPaidStatus;
      })
    );
    if (hasPaid) {
      toast.error("Cannot delete event because payments have already been received.");
      setDeleteConfirmOpen(false);
      return;
    }
    setDeleting(true);
    try {
      await deleteEventAsync(event.eventId);
      toast.success(TOAST_MESSAGES?.EVENTS?.DELETED_SUCCESS || "Event deleted successfully");
      setDeleteConfirmOpen(false);
      onClose();
      if (onDeleteSuccess) {
        onDeleteSuccess(event.eventId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES?.GENERAL?.DELETE_FAILED || "Failed to delete event");
    } finally {
      setDeleting(false);
    }
  };

  // Fetch contributions for this event
  useEffect(() => {
    if (open && event?.eventId) {
      const fetchContributions = async () => {
        setLoading(true);
        try {
          const data = await getContributionsByEventAsync(event.eventId);
          setContributions(data || []);
        } catch (error) {
          toast.error("Failed to load event contributions");
        } finally {
          setLoading(false);
        }
      };
      fetchContributions();
    } else {
      setContributions([]);
    }
  }, [open, event?.eventId]);

  // Fallback to fetch members if not passed via props
  useEffect(() => {
    if (open && (!members || members.length === 0)) {
      getMembersAsync()
        .then((res) => {
          if (Array.isArray(res)) setInternalMembers(res);
        })
        .catch(() => { });
    }
  }, [open, members]);

  // Filter all members to only active, non-exited accounts
  const rawMembers = members && members.length > 0 ? members : internalMembers;
  const allMembers = (rawMembers || []).filter(
    (m) => m && m.isActive !== false && !m.isExited && !m.isDeleted
  );

  const allocatedAmt = (activeEvent?.useAvailableBalance || event?.useAvailableBalance)
    ? Number(activeEvent?.allocatedAmount ?? event?.allocatedAmount ?? 0)
    : 0;
  const rawBudget = Math.max(
    Number(activeEvent?.baseAmount ?? event?.baseAmount ?? 0),
    Number(activeEvent?.totalExpectedAmount ?? event?.totalExpectedAmount ?? 0) + allocatedAmt
  );
  const totalExpected = roundToWhole(
    allocatedAmt > 0
      ? Math.max(0, (Number(activeEvent?.baseAmount ?? event?.baseAmount ?? 0) || rawBudget) - allocatedAmt)
      : (Number(activeEvent?.totalExpectedAmount ?? event?.totalExpectedAmount) || rawBudget)
  );

  const isContributionPaid = (c) => {
    if (!c) return false;
    const rawStatus = String(c.statusName || c.status || "").trim().toLowerCase();
    const paymentStatusNum = Number(c.paymentStatus);
    const paymentStatusStr = String(c.paymentStatus || "").trim().toLowerCase();

    if (paymentStatusNum === 1 || rawStatus === "pending" || rawStatus === "rejected" || paymentStatusStr === "pending" || paymentStatusStr === "rejected") {
      return false;
    }

    return (
      paymentStatusNum === 2 ||
      rawStatus === "paid" ||
      rawStatus === "verified" ||
      rawStatus === "approved" ||
      rawStatus === "closed" ||
      rawStatus === "completed" ||
      paymentStatusStr === "paid"
    );
  };

  const paidList = useMemo(() => {
    return (contributions || []).filter(isContributionPaid);
  }, [contributions]);

  const unpaidList = useMemo(() => {
    return (contributions || []).filter((c) => !isContributionPaid(c));
  }, [contributions]);

  const totalPaid = useMemo(() => {
    return paidList.reduce((sum, c) => sum + roundToWhole(Number(c.paidAmount || c.amount || 0)), 0);
  }, [paidList]);

  const totalUnpaid = Math.max(0, totalExpected - totalPaid);

  const getMemberWorkType = (memberId, memberName) => {
    const m = allMembers.find(
      (mem) =>
        (memberId && (String(mem.id) === String(memberId) || String(mem.memberId) === String(memberId))) ||
        (memberName && (mem.name || mem.fullName || "").trim().toLowerCase() === String(memberName).trim().toLowerCase())
    );
    return m?.workType || "Office";
  };

  const getInitials = (name) => {
    if (!name) return "M";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const filteredPaid = useMemo(() => {
    if (!memberSearchQuery.trim()) return paidList;
    const q = memberSearchQuery.toLowerCase().trim();
    return paidList.filter((c) => (c.memberName || "").toLowerCase().includes(q));
  }, [paidList, memberSearchQuery]);

  const filteredUnpaid = useMemo(() => {
    if (!memberSearchQuery.trim()) return unpaidList;
    const q = memberSearchQuery.toLowerCase().trim();
    return unpaidList.filter((c) => (c.memberName || "").toLowerCase().includes(q));
  }, [unpaidList, memberSearchQuery]);

  const isBirthday = Boolean(
    event?.eventTypeName?.toLowerCase().includes("birthday") ||
    event?.eventName?.toLowerCase().includes("birthday")
  );

  const isChristmas = Boolean(
    String(activeEvent?.eventTypeName || activeEvent?.category || activeEvent?.eventName || event?.eventTypeName || event?.category || event?.eventName || "")
      .toLowerCase()
      .includes("christma")
  );

  const eventSponsorsList = useMemo(() => {
    const current = detailedEvent || event;
    if (!current) return [];
    if (Array.isArray(current.sponsors) && current.sponsors.length > 0) {
      return current.sponsors
        .filter((s) => s && s.isActive !== false)
        .map((s, idx) => {
          const uId = s.sponsorUserId || s.userId;
          const matchedMem = allMembers.find(
            (m) =>
              (uId && (String(m.id) === String(uId) || String(m.memberId) === String(uId))) ||
              (s.sponsorName && (m.name || m.fullName || "").trim().toLowerCase() === String(s.sponsorName).trim().toLowerCase())
          );
          return {
            id: s.sponsorId || uId || `sp-${idx}`,
            memberId: uId,
            name: s.sponsorName || matchedMem?.name || s.name || "Sponsor",
            amount: Number(s.contributionAmount ?? s.amount ?? 0),
            workType: matchedMem?.workType || matchedMem?.memberType || s.workType || "Office",
            roleType: "Sponsor",
            isSponsor: true,
          };
        });
    }
    if (current.sponsorName || Number(current.sponsorContributionAmount || 0) > 0) {
      const uId = current.sponsorUserId;
      const matchedMem = allMembers.find(
        (m) =>
          (uId && (String(m.id) === String(uId) || String(m.memberId) === String(uId))) ||
          (current.sponsorName && (m.name || m.fullName || "").trim().toLowerCase() === String(current.sponsorName).trim().toLowerCase())
      );
      return [
        {
          id: current.sponsorUserId || "sp-0",
          memberId: current.sponsorUserId,
          name: current.sponsorName || matchedMem?.name || "Sponsor",
          amount: Number(current.sponsorContributionAmount || 0),
          workType: matchedMem?.workType || matchedMem?.memberType || "Office",
          roleType: "Sponsor",
          isSponsor: true,
        },
      ];
    }
    return [];
  }, [detailedEvent, event, allMembers]);

  const totalSponsorAmount = useMemo(() => {
    return eventSponsorsList.reduce((sum, sp) => sum + (Number(sp.amount) || 0), 0);
  }, [eventSponsorsList]);

  // Strip internal metadata comments (<!--contrib:...-->, <!--celebrants:...-->, etc.) from a description string
  const stripContribMeta = (desc) =>
    (desc || "").replace(/<!--[\s\S]*?-->/gi, "").trim();

  // Extract celebrants metadata saved as <!--celebrants:{"marriage":[...],"sendOff":[...]}-->
  const extractCelebrantsMeta = (desc) => {
    if (!desc) return null;
    const match = desc.match(/<!--celebrants:(.*?)-->/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  };

  const celebrantsMeta =
    extractCelebrantsMeta(activeEvent?.description) ||
    extractCelebrantsMeta(event?.description);

  // Extract multiple event dates from DTO property, JSON string, or HTML comment
  const parseEventDates = (evt) => {
    if (evt?.eventTypeDates && typeof evt.eventTypeDates === "object") {
      return evt.eventTypeDates;
    }
    if (evt?.eventDates) {
      if (typeof evt.eventDates === "object" && !Array.isArray(evt.eventDates)) {
        return evt.eventDates;
      }
      try {
        const parsed = JSON.parse(evt.eventDates);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      } catch {}
    }
    const desc = evt?.description || "";
    const match = desc.match(/<!--eventDates:(.*?)-->/);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return null;
  };

  const parsedEventDates = parseEventDates(activeEvent) || parseEventDates(event);

  const parseMemberDates = (evt) => {
    if (evt?.eventTypeMemberDates && typeof evt.eventTypeMemberDates === "object") {
      return evt.eventTypeMemberDates;
    }
    const desc = evt?.description || "";
    const match = desc.match(/<!--memberDates:(.*?)-->/);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {}
    }
    if (parsedEventDates) {
      const obj = {};
      Object.entries(parsedEventDates).forEach(([k, v]) => {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          obj[k] = v;
        }
      });
      if (Object.keys(obj).length > 0) return obj;
    }
    return null;
  };

  const parsedMemberDates = parseMemberDates(activeEvent) || parseMemberDates(event);

  const getEventDateForType = (typeName, fallbackDate) => {
    if (!parsedEventDates) return fallbackDate;
    if (parsedEventDates[typeName]) {
      const val = parsedEventDates[typeName];
      if (typeof val === "object" && val !== null) {
        return Array.from(new Set(Object.values(val).filter(Boolean))).map(formatViewDate).join(", ");
      }
      return formatViewDate(val);
    }
    const lowerType = (typeName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const [k, v] of Object.entries(parsedEventDates)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, "") === lowerType) {
        if (typeof v === "object" && v !== null) {
          return Array.from(new Set(Object.values(v).filter(Boolean))).map(formatViewDate).join(", ");
        }
        return formatViewDate(v);
      }
    }
    return fallbackDate;
  };

  const getEventDateForMember = (typeName, memberId, fallbackDate) => {
    if (parsedMemberDates) {
      const lowerType = (typeName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const [k, v] of Object.entries(parsedMemberDates)) {
        if (k.toLowerCase().replace(/[^a-z0-9]/g, "") === lowerType && typeof v === "object" && v !== null) {
          if (v[memberId]) return formatViewDate(v[memberId]);
        }
      }
      if (parsedMemberDates[typeName] && typeof parsedMemberDates[typeName] === "object") {
        if (parsedMemberDates[typeName][memberId]) return formatViewDate(parsedMemberDates[typeName][memberId]);
      }
    }
    return getEventDateForType(typeName, fallbackDate);
  };

  // Helper to parse celebrants list directly from description string:
  // e.g. "Birthday celebration (4 Office, 0 WFH) for Albin (30 Sep), Michael Antony Raj C (18 Sep)... Planned Budget: ..."
  const parseCelebrantsFromDescription = (desc) => {
    if (!desc) return [];
    const desc_clean = stripContribMeta(desc);
    const match = desc_clean.match(/for\s+(.*?)(?:\.\s*Planned Budget|\.|$)/i);
    if (!match || !match[1]) return [];
    const celebrantsText = match[1];
    const items = celebrantsText.split(/,\s*/);
    const result = [];
    items.forEach((item, idx) => {
      const cleanItem = item.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      const m = cleanItem.match(/^(.*?)\s*\((.*?)\)$/);
      if (m) {
        result.push({
          id: `parsed-${idx}`,
          name: m[1].trim(),
          dobText: m[2].trim(),
        });
      } else if (cleanItem) {
        result.push({
          id: `parsed-${idx}`,
          name: cleanItem,
          dobText: "--",
        });
      }
    });
    return result;
  };

  // Compile birthday members & DOB table data (strictly deduplicated)
  const getTableCelebrants = () => {
    if (!isBirthday || !event) return [];

    const eventMonth = event?.eventDate ? dayjs(event.eventDate).month() : -1;
    const map = new Map();

    const getDedupeKey = (id, name, dob) => {
      const cleanName = (name || "").toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      const cleanDob = dob ? dayjs(dob).format("YYYY-MM-DD") : "";
      if (cleanName && cleanDob) {
        return `${cleanName}|${cleanDob}`;
      }
      if (id && !String(id).startsWith("parsed-")) {
        return `id:${id}`;
      }
      return cleanName || `id:${id}`;
    };

    // 1. Process parsed items from description (maintains exact list from description)
    const parsedList = parseCelebrantsFromDescription(event?.description);
    parsedList.forEach((item) => {
      const cleanItemName = item.name.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      let match = allMembers.find((m) => {
        if (!m.name) return false;
        const cleanMName = m.name.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
        return cleanMName === cleanItemName;
      });

      if (!match) {
        match = allMembers.find((m) => {
          if (!m.name) return false;
          const cleanMName = m.name.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
          return cleanMName.includes(cleanItemName) || cleanItemName.includes(cleanMName);
        });
      }

      const resolvedName = match?.name || item.name;
      const resolvedDob = match?.dateOfBirth || null;
      const dedupeKey = getDedupeKey(match?.memberId || item.id, resolvedName, resolvedDob);

      if (!map.has(dedupeKey)) {
        map.set(dedupeKey, {
          id: match?.memberId || item.id,
          name: resolvedName,
          dateOfBirth: resolvedDob,
          dobFormatted: resolvedDob
            ? dayjs(resolvedDob).format("DD/MM/YYYY")
            : item.dobText,
          dobDayMonth: resolvedDob
            ? dayjs(resolvedDob).format("D MMMM")
            : item.dobText,
          workType: match?.workType || match?.memberType || "Office",
        });
      }
    });

    // 2. Identify actual birthday celebrants from active members matching the event month
    if (eventMonth >= 0) {
      // First check participants who have a birthday in the event month
      const participantIds = (event.participants || []).map((p) => p.memberId || p.id);
      const participantMonthMatches = allMembers.filter(
        (m) => participantIds.includes(m.memberId) && m.dateOfBirth && dayjs(m.dateOfBirth).month() === eventMonth
      );

      // Check all active members who have a birthday in the event month
      const allMonthMatches = allMembers.filter(
        (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === eventMonth
      );

      const celebrantCandidates = participantMonthMatches.length > 0 ? participantMonthMatches : allMonthMatches;

      celebrantCandidates.forEach((m) => {
        const dedupeKey = getDedupeKey(m.memberId, m.name, m.dateOfBirth);
        if (!map.has(dedupeKey)) {
          map.set(dedupeKey, {
            id: m.memberId,
            name: m.name,
            dateOfBirth: m.dateOfBirth,
            dobFormatted: dayjs(m.dateOfBirth).format("DD/MM/YYYY"),
            dobDayMonth: dayjs(m.dateOfBirth).format("D MMMM"),
            workType: m.workType || m.memberType || "Office",
          });
        } else {
          // If already present, enrich missing birth date or ID if parsed item didn't have it
          const existing = map.get(dedupeKey);
          if (!existing.dateOfBirth && m.dateOfBirth) {
            existing.id = m.memberId;
            existing.dateOfBirth = m.dateOfBirth;
            existing.dobFormatted = dayjs(m.dateOfBirth).format("DD/MM/YYYY");
            existing.dobDayMonth = dayjs(m.dateOfBirth).format("D MMMM");
            existing.workType = m.workType || m.memberType || existing.workType || "Office";
          }
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      const dayA = a.dateOfBirth ? dayjs(a.dateOfBirth).date() : 0;
      const dayB = b.dateOfBirth ? dayjs(b.dateOfBirth).date() : 0;
      return dayA - dayB;
    });
  };

  // Helper to normalize any role/event type key into its canonical display name
  const getCanonicalRoleName = (key) => {
    if (!key) return "";
    const cleaned = String(key).toLowerCase().replace(/[\s_-]/g, "");
    if (cleaned.includes("birthday")) return "Birthday";
    if (cleaned.includes("marriage") || cleaned.includes("wedding")) return "Marriage";
    if (cleaned.includes("sendoff") || cleaned.includes("farewell") || cleaned.includes("relieving")) return "Send Off";
    const matched = (eventTypes || internalEventTypes || []).find((t) => {
      const tClean = String(t.eventTypeName || "").toLowerCase().replace(/[\s_-]/g, "");
      return tClean === cleaned || cleaned.includes(tClean) || tClean.includes(cleaned);
    });
    if (matched) return matched.eventTypeName;
    const spaced = String(key).replace(/([A-Z])/g, " $1").trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  const getTableMembers = () => {
    const currentEvent = detailedEvent || event;
    if (!currentEvent) return [];

    const defaultEventDate = currentEvent?.eventDate
      ? dayjs(currentEvent.eventDate).format("DD/MM/YYYY")
      : "--";
    const eventDateFormatted = defaultEventDate;

    // Merged celebrants metadata from backend DTO or description tag
    const mergedCelebrants = {
      ...(currentEvent?.eventTypeMembers || {}),
      ...(celebrantsMeta || {}),
    };

    // Group and deduplicate celebrant IDs by canonical role name to prevent duplicates (e.g. "Send Off" vs "sendOff")
    const canonicalCelebrants = {};
    Object.entries(mergedCelebrants).forEach(([rawKey, memberIds]) => {
      if (!Array.isArray(memberIds) || memberIds.length === 0) return;
      const roleName = getCanonicalRoleName(rawKey);
      if (!roleName || roleName.toLowerCase() === "birthday") return;

      if (!canonicalCelebrants[roleName]) {
        canonicalCelebrants[roleName] = [];
      }
      memberIds.forEach((mId) => {
        if (!canonicalCelebrants[roleName].includes(mId)) {
          canonicalCelebrants[roleName].push(mId);
        }
      });
    });

    const hasFeaturedCelebrants = Object.keys(canonicalCelebrants).length > 0;

    const result = [];

    // 1. If it includes birthday, add birthday celebrants
    if (isBirthday) {
      const bdayCelebrants = getTableCelebrants().map((c) => ({
        ...c,
        roleType: "Birthday",
        dateValue: c.dobFormatted,
      }));
      result.push(...bdayCelebrants);
    }

    // 2. Add celebrants for all other featured canonical event types without duplicate rows
    if (hasFeaturedCelebrants) {
      Object.entries(canonicalCelebrants).forEach(([roleName, memberIds]) => {
        memberIds.forEach((mId) => {
          // Avoid duplicate member in the same role
          if (result.some((r) => r.memberId === mId && r.roleType === roleName)) return;

          const matched = allMembers.find((m) => m.memberId === mId);
          if (matched) {
            result.push({
              id: `${roleName}-${mId}`,
              memberId: mId,
              name: matched.name,
              dateValue: getEventDateForMember(roleName, mId, defaultEventDate),
              workType: matched.workType || matched.memberType || "Office",
              roleType: roleName,
            });
          }
        });
      });
    }

    // If celebrants (birthday and/or featured) exist, return them
    if (result.length > 0) {
      return result;
    }

    // If Christmas event type, strictly show sponsor person names and amounts (do not dump participants as celebrants)
    if (isChristmas) {
      if (eventSponsorsList.length > 0) {
        return eventSponsorsList.map((sp) => ({
          ...sp,
          dateValue: formatWholeCurrency(sp.amount),
          amountFormatted: formatWholeCurrency(sp.amount),
        }));
      }
      return [];
    }

    // 2. Fallback to participating members if no specific send-off or marriage members are designated
    const map = new Map();

    const participants = currentEvent.participants || [];
    participants.forEach((p) => {
      const pId = p.memberId || p.id;
      const matched = allMembers.find((m) => m.memberId === pId);
      const name = p.name || p.memberName || matched?.name || "";
      if (!name) return;
      const workType = matched?.workType || matched?.memberType || p.workType || p.memberType || "Office";
      const key = pId ? `id:${pId}` : name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          id: pId || key,
          name,
          dateValue: eventDateFormatted,
          workType,
        });
      }
    });

    const participantIds = currentEvent.participantIds || [];
    participantIds.forEach((pId) => {
      const matched = allMembers.find((m) => m.memberId === pId);
      if (!matched) return;
      const key = `id:${pId}`;
      if (!map.has(key)) {
        map.set(key, {
          id: pId,
          name: matched.name,
          dateValue: eventDateFormatted,
          workType: matched.workType || matched.memberType || "Office",
        });
      }
    });

    (contributions || []).forEach((c) => {
      const cId = c.memberId;
      const matched = allMembers.find((m) => m.memberId === cId);
      const name = c.memberName || matched?.name || "";
      if (!name) return;
      const workType = matched?.workType || matched?.memberType || c.workType || c.memberType || "Office";
      const key = cId ? `id:${cId}` : name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          id: cId || key,
          name,
          dateValue: eventDateFormatted,
          workType,
        });
      }
    });

    if (map.size === 0 && allMembers.length > 0) {
      allMembers.forEach((m) => {
        const key = `id:${m.memberId}`;
        map.set(key, {
          id: m.memberId,
          name: m.name,
          dateValue: eventDateFormatted,
          workType: m.workType || m.memberType || "Office",
        });
      });
    }

    return Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  };

  const tableMembers = getTableMembers();

  // Determine dynamic roles in the table
  const uniqueRoles = Array.from(new Set(tableMembers.map((m) => m.roleType).filter(Boolean)));
  const hasMultipleRoles = uniqueRoles.length > 1;
  const isSingleBirthday = uniqueRoles.length === 1 && uniqueRoles[0] === "Birthday";
  const hasMarriageInTable = uniqueRoles.some((r) => r.toLowerCase().includes("marriage"));
  const hasSendOffInTable = uniqueRoles.some((r) => r.toLowerCase().includes("send"));

  const isSponsorTable = tableMembers.some((m) => m.isSponsor || m.roleType === "Sponsor");

  const tableMembersLabel = isSponsorTable
    ? `${tableMembers.length} Sponsor${tableMembers.length !== 1 ? "s" : ""} (${formatWholeCurrency(totalSponsorAmount)})`
    : uniqueRoles.length > 1
    ? `${tableMembers.length} Celebrants (${uniqueRoles.join(", ")})`
    : uniqueRoles.length === 1
    ? `${tableMembers.length} ${uniqueRoles[0]} Celebrant${tableMembers.length !== 1 ? "s" : ""}`
    : `${tableMembers.length} Participating Member${tableMembers.length !== 1 ? "s" : ""}`;

  const tableMemberColumnTitle = isSponsorTable
    ? "Sponsor Name"
    : isSingleBirthday
    ? "Birthday Member"
    : uniqueRoles.length === 1
    ? `${uniqueRoles[0]} Celebrant`
    : "Celebrant / Member Name";

  const dateColumnTitle = isSponsorTable
    ? "Contribution Amount"
    : isSingleBirthday
    ? "Date of Birth"
    : hasMultipleRoles
    ? "Event Date / DOB"
    : "Event Date";

  // Overview summary text for description — always strip internal contrib metadata
  const getOverviewText = () => {
    const desc = activeEvent?.description || event?.description || "";
    if (!desc) return "";
    const clean = stripContribMeta(desc);
    const match = clean.match(/^(Birthday celebration.*?)\s*for.*?\.\s*(Planned Budget.*)$/i);
    if (match) {
      return `${match[1]} • ${match[2]}`;
    }
    return clean;
  };

  const overviewText = isBirthday && tableMembers.length > 0
    ? getOverviewText()
    : stripContribMeta(activeEvent?.description || event?.description || "");

  if (!open || !event) {
    return null;
  }

  return (
    <>
      <AppDialog
        open={open}
        onClose={onClose}
        title="Event Details"
        maxWidth="md"
        actions={
          <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%", alignItems: "center" }}>
            <AppButton
              variant="outlined"
              color="inherit"
              onClick={onClose}
              sx={{
                borderColor: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "rgba(74, 63, 107, 0.4)",
                color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                "&:hover": {
                  borderColor: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(74, 63, 107, 0.04)",
                }
              }}
            >
              Close
            </AppButton>
          </Box>
        }
      >
        <Grid container spacing={3}>
          {/* Category / Event Type */}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.65rem",
                  display: "block",
                  mb: 0.2,
                }}
              >
                Event Type
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.2 }}>
                {(() => {
                  const set = new Set();
                  const rawType = event?.eventTypeName || event?.category || "";
                  if (rawType) {
                    rawType.split(/[,&/]+/).map((s) => s.trim()).filter(Boolean).forEach((c) => set.add(getCanonicalRoleName(c)));
                  }
                  const name = String(event?.eventName || "").toLowerCase();
                  if (name.includes("birthday")) set.add("Birthday");
                  if (name.includes("marriage") || name.includes("wedding")) set.add("Marriage");
                  if (name.includes("send off") || name.includes("send-off") || name.includes("sendoff") || name.includes("relieving")) set.add("Send Off");
                  if (name.includes("farewell")) set.add("Farewell");

                  if (parsedEventDates && typeof parsedEventDates === "object") {
                    Object.keys(parsedEventDates).forEach((k) => {
                      const cName = getCanonicalRoleName(k);
                      if (cName) set.add(cName);
                    });
                  }
                  if (uniqueRoles && uniqueRoles.length > 0) {
                    uniqueRoles.forEach((r) => set.add(getCanonicalRoleName(r)));
                  }

                  const cats = Array.from(set).filter(Boolean);
                  if (cats.length === 0) cats.push("Custom Event");

                  return cats.map((cat, idx) => {
                    const norm = cat.toLowerCase();
                    const isBday = norm.includes("birthday");
                    const isFarewell = norm.includes("farewell") || norm.includes("send off") || norm.includes("send-off");
                    const isMarriage = norm.includes("marriage") || norm.includes("wedding");
                    const color = isBday ? "#7c3aed" : isMarriage ? "#db2777" : isFarewell ? "#0284c7" : "#4a3f6b";
                    const bgcolor = isBday ? "rgba(124, 58, 237, 0.12)" : isMarriage ? "rgba(219, 39, 119, 0.12)" : isFarewell ? "rgba(2, 132, 199, 0.12)" : "rgba(74, 63, 107, 0.12)";
                    const borderColor = isBday ? "rgba(124, 58, 237, 0.3)" : isMarriage ? "rgba(219, 39, 119, 0.3)" : isFarewell ? "rgba(2, 132, 199, 0.3)" : "rgba(74, 63, 107, 0.3)";

                    return (
                      <Chip
                        key={idx}
                        size="small"
                        label={cat}
                        sx={{
                          height: 22,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color,
                          bgcolor,
                          border: `1px solid ${borderColor}`,
                          "& .MuiChip-label": { px: 0.8 },
                        }}
                      />
                    );
                  });
                })()}
                {eventSponsorsList.map((sp, idx) => (
                  <Chip
                    key={sp.id || idx}
                    size="small"
                    label={`Sponsor: ${sp.name} (${formatWholeCurrency(sp.amount)})`}
                    sx={{
                      height: 22,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: (theme) => theme.palette.mode === "dark" ? "#c4b5fd" : "#6d28d9",
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      "& .MuiChip-label": { px: 0.8 },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Grid>

          {/* Event Identity / Event Name */}
          <Grid size={{ xs: 6, sm: 3, md: 3 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.65rem",
                  display: "block",
                  mb: 0.2,
                }}
              >
                Event Name
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                {event?.eventName || ""}
              </Typography>
            </Box>
          </Grid>

          {/* Date */}
          <Grid size={{ xs: 6, sm: 3, md: parsedEventDates && Object.keys(parsedEventDates).length > 1 ? 3 : 2.5 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.65rem",
                  display: "block",
                  mb: 0.2,
                }}
              >
                {parsedEventDates && Object.keys(parsedEventDates).length > 1 ? "Event Dates" : "Date"}
              </Typography>
              {parsedEventDates && Object.keys(parsedEventDates).length > 1 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.2 }}>
                  {Object.entries(parsedEventDates).map(([tName, dVal]) => (
                    <Box key={tName} sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                      <Chip
                        size="small"
                        label={tName}
                        sx={{
                          height: 18,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(124, 58, 237, 0.2)" : "rgba(74, 63, 107, 0.1)",
                          color: (theme) => theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                        }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                        {typeof dVal === "object" && dVal !== null
                          ? Array.from(new Set(Object.values(dVal).filter(Boolean))).map(formatViewDate).join(", ")
                          : formatViewDate(dVal)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatViewDate(event?.eventDate)}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Created By */}
          <Grid size={{ xs: 6, sm: 3, md: 2.25 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.65rem",
                  display: "block",
                  mb: 0.2,
                }}
              >
                Created By
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {event?.createdByName || event?.createdBy || "--"}
              </Typography>
            </Box>
          </Grid>

          {/* Created On */}
          <Grid size={{ xs: 6, sm: 3, md: 2.25 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.65rem",
                  display: "block",
                  mb: 0.2,
                }}
              >
                Created On
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatViewDate(event?.createdAt || event?.createdOn)}
              </Typography>
            </Box>
          </Grid>

          {/* Description Section with Birthday Members & DOB Table */}
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: 2,
                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0,0,0,0.02)",
                borderRadius: "8px",
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Description
                </Typography>
                {tableMembers.length > 0 && (
                  <Chip
                    size="small"
                    label={tableMembersLabel}
                    sx={{
                      height: 22,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? (isSponsorTable ? "rgba(139, 92, 246, 0.2)" : isBirthday ? "rgba(192, 38, 211, 0.2)" : (hasSendOffInTable || hasMarriageInTable) ? "rgba(124, 58, 237, 0.2)" : "rgba(14, 165, 233, 0.2)")
                          : (isSponsorTable ? "rgba(139, 92, 246, 0.12)" : isBirthday ? "rgba(192, 38, 211, 0.1)" : (hasSendOffInTable || hasMarriageInTable) ? "rgba(124, 58, 237, 0.1)" : "rgba(14, 165, 233, 0.1)"),
                      color: (theme) =>
                        theme.palette.mode === "dark"
                          ? (isSponsorTable ? "#c4b5fd" : isBirthday ? "#f0abfc" : (hasSendOffInTable || hasMarriageInTable) ? "#c4b5fd" : "#38bdf8")
                          : (isSponsorTable ? "#7c3aed" : isBirthday ? "#86198f" : (hasSendOffInTable || hasMarriageInTable) ? "#6d28d9" : "#0284c7"),
                      borderRadius: "6px",
                    }}
                  />
                )}
              </Box>

              {overviewText && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.primary",
                    fontSize: "0.8rem",
                    lineHeight: 1.5,
                    mb: tableMembers.length > 0 ? 1.5 : 0,
                    fontWeight: 500,
                  }}
                >
                  {overviewText}
                </Typography>
              )}

              {/* Table of Members */}
              {tableMembers.length > 0 && (
                <Box
                  sx={{
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#ffffff",
                    maxHeight: tableMembers.length > 6 ? 260 : "none",
                    overflowY: tableMembers.length > 6 ? "auto" : "visible",
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow
                        sx={{
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(74, 63, 107, 0.25)" : "rgba(74, 63, 107, 0.06)",
                        }}
                      >
                        <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem", py: 0.8, width: 45, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1b1828" : "#f5f4fb" }}>
                          S.no
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem", py: 0.8, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1b1828" : "#f5f4fb" }}>
                          {tableMemberColumnTitle}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem", py: 0.8, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1b1828" : "#f5f4fb" }}>
                          {dateColumnTitle}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem", py: 0.8, width: 110, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1b1828" : "#f5f4fb" }}>
                          Work Type
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableMembers.map((celebrant, index) => (
                        <TableRow
                          key={celebrant.id || index}
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                            "&:hover": {
                              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(74, 63, 107, 0.03)",
                            },
                          }}
                        >
                          <TableCell sx={{ fontSize: "0.75rem", py: 0.8, color: "text.secondary", fontWeight: 700 }}>
                            {index + 1}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.78rem", py: 0.8, fontWeight: 700 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography component="span" sx={{ fontWeight: 700, fontSize: "0.78rem", color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "text.primary" }}>
                                {celebrant.name}
                              </Typography>
                              {celebrant.roleType && (
                                <Chip
                                  size="small"
                                  label={celebrant.roleType}
                                  sx={{
                                    height: 18,
                                    fontSize: "0.62rem",
                                    fontWeight: 700,
                                    bgcolor: (theme) =>
                                      theme.palette.mode === "dark"
                                        ? celebrant.roleType === "Sponsor"
                                          ? "rgba(139, 92, 246, 0.2)"
                                          : celebrant.roleType === "Birthday"
                                          ? "rgba(168, 85, 247, 0.2)"
                                          : celebrant.roleType.toLowerCase().includes("marriage")
                                          ? "rgba(236, 72, 153, 0.2)"
                                          : "rgba(14, 165, 233, 0.2)"
                                        : celebrant.roleType === "Sponsor"
                                        ? "rgba(139, 92, 246, 0.12)"
                                        : celebrant.roleType === "Birthday"
                                        ? "rgba(168, 85, 247, 0.12)"
                                        : celebrant.roleType.toLowerCase().includes("marriage")
                                        ? "rgba(236, 72, 153, 0.12)"
                                        : "rgba(14, 165, 233, 0.12)",
                                    color: (theme) =>
                                      theme.palette.mode === "dark"
                                        ? celebrant.roleType === "Sponsor"
                                          ? "#c4b5fd"
                                          : celebrant.roleType === "Birthday"
                                          ? "#d8b4fe"
                                          : celebrant.roleType.toLowerCase().includes("marriage")
                                          ? "#f472b6"
                                          : "#38bdf8"
                                        : celebrant.roleType === "Sponsor"
                                        ? "#7c3aed"
                                        : celebrant.roleType === "Birthday"
                                        ? "#7e22ce"
                                        : celebrant.roleType.toLowerCase().includes("marriage")
                                        ? "#db2777"
                                        : "#0284c7",
                                    borderRadius: "4px",
                                    "& .MuiChip-label": { px: 0.6 },
                                  }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.78rem", py: 0.8, fontWeight: isSponsorTable ? 700 : 600, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : isSponsorTable ? "primary.main" : "text.primary" }}>
                            {isSponsorTable ? (celebrant.amountFormatted || formatWholeCurrency(celebrant.amount)) : (celebrant.dateValue || (isSingleBirthday ? celebrant.dobFormatted : "--"))}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.75rem", py: 0.8 }}>
                            <Chip
                              size="small"
                              label={celebrant.workType || celebrant.memberType || "Office"}
                              sx={{
                                height: 18,
                                fontSize: "0.64rem",
                                fontWeight: 700,
                                bgcolor: (celebrant.workType || celebrant.memberType) === "WFH" ? "rgba(234, 88, 12, 0.1)" : "rgba(2, 132, 199, 0.1)",
                                color: (celebrant.workType || celebrant.memberType) === "WFH" ? "#ea580c" : "#0284c7",
                                borderRadius: "4px",
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Financial Metrics */}
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: "text.secondary",
                      fontSize: "0.65rem",
                    }}
                  >
                    Total Expected
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "primary.main" }}>
                    {formatWholeCurrency(totalExpected)}
                  </Typography>
                  {totalSponsorAmount > 0 && (
                    <Typography variant="caption" sx={{ color: "#8b5cf6", fontSize: "0.72rem", display: "block", fontWeight: 600 }}>
                      (Total: {formatWholeCurrency(Number(activeEvent?.originalPlannedBudget || activeEvent?.baseAmount || rawBudget))} • Sponsor: {formatWholeCurrency(totalSponsorAmount)})
                    </Typography>
                  )}
                  {allocatedAmt > 0 && (
                    <Typography variant="caption" sx={{ color: "#16a34a", fontSize: "0.72rem", display: "block" }}>
                      (Budget: {formatWholeCurrency(rawBudget)} - {formatWholeCurrency(allocatedAmt)} from Hand)
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ borderLeft: { md: "1px solid rgba(0,0,0,0.08)" }, pl: { md: 2 } }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: "text.secondary",
                      fontSize: "0.65rem",
                    }}
                  >
                    Total Paid
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "success.main" }}>
                    {formatWholeCurrency(totalPaid)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ borderLeft: { md: "1px solid rgba(0,0,0,0.08)" }, pl: { md: 2 } }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: "text.secondary",
                      fontSize: "0.65rem",
                    }}
                  >
                    Unpaid Amount
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#dc2626" }}>
                    {formatWholeCurrency(totalUnpaid)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>

          {/* ── Paid & Unpaid Member Status Section ── */}
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: "12px",
                border: "1px solid",
                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
                bgcolor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(74, 63, 107, 0.02)",
                mt: 0.5,
              }}
            >
              {/* Section Header with Controls */}
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  mb: 2,
                }}
              >
                {/* Left: Section Title & Filter Tabs */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      color: isDark ? "#ffffff" : "#2a1b4d",
                      mr: 1,
                    }}
                  >
                    Member Contribution Status
                  </Typography>

                  {/* Segmented Filter Pills */}
                  <Box
                    sx={{
                      display: "inline-flex",
                      p: "3px",
                      borderRadius: "8px",
                      bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
                      border: "1px solid",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                    }}
                  >
                    <Button
                      size="small"
                      onClick={() => setMemberViewTab("split")}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        py: 0.4,
                        px: 1.2,
                        minHeight: 26,
                        height: 26,
                        borderRadius: "6px",
                        bgcolor: memberViewTab === "split"
                          ? isDark ? "#4a3f6b" : "#ffffff"
                          : "transparent",
                        color: memberViewTab === "split"
                          ? isDark ? "#ffffff" : "#4a3f6b"
                          : "text.secondary",
                        boxShadow: memberViewTab === "split" ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                        "&:hover": {
                          bgcolor: memberViewTab === "split"
                            ? isDark ? "#5a4f7c" : "#ffffff"
                            : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                        },
                      }}
                    >
                      Split View
                    </Button>

                    <Button
                      size="small"
                      onClick={() => setMemberViewTab("paid")}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        py: 0.4,
                        px: 1.2,
                        minHeight: 26,
                        height: 26,
                        borderRadius: "6px",
                        bgcolor: memberViewTab === "paid"
                          ? isDark ? "rgba(16, 185, 129, 0.25)" : "#dcfce7"
                          : "transparent",
                        color: memberViewTab === "paid"
                          ? isDark ? "#34d399" : "#15803d"
                          : "text.secondary",
                        boxShadow: memberViewTab === "paid" ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                        "&:hover": {
                          bgcolor: memberViewTab === "paid"
                            ? isDark ? "rgba(16, 185, 129, 0.35)" : "#bbf7d0"
                            : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                        },
                      }}
                    >
                      Paid ({paidList.length})
                    </Button>

                    <Button
                      size="small"
                      onClick={() => setMemberViewTab("unpaid")}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        py: 0.4,
                        px: 1.2,
                        minHeight: 26,
                        height: 26,
                        borderRadius: "6px",
                        bgcolor: memberViewTab === "unpaid"
                          ? isDark ? "rgba(244, 63, 94, 0.25)" : "#ffe4e6"
                          : "transparent",
                        color: memberViewTab === "unpaid"
                          ? isDark ? "#fb7185" : "#be123c"
                          : "text.secondary",
                        boxShadow: memberViewTab === "unpaid" ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                        "&:hover": {
                          bgcolor: memberViewTab === "unpaid"
                            ? isDark ? "rgba(244, 63, 94, 0.35)" : "#fecdd3"
                            : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                        },
                      }}
                    >
                      Unpaid ({unpaidList.length})
                    </Button>
                  </Box>
                </Box>

                {/* Right: Quick Search Box */}
                <TextField
                  size="small"
                  placeholder="Search member..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: memberSearchQuery ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setMemberSearchQuery("")} sx={{ p: 0.2 }}>
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                    sx: {
                      height: 30,
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      width: { xs: "100%", sm: 200 },
                      bgcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "#ffffff",
                    },
                  }}
                />
              </Box>

              {/* Loading State */}
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {/* Paid Members Column */}
                  {(memberViewTab === "split" || memberViewTab === "paid") && (
                    <Grid size={{ xs: 12, md: memberViewTab === "split" ? 6 : 12 }}>
                      <Box
                        sx={{
                          borderRadius: "10px",
                          border: "1px solid",
                          borderColor: isDark ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.3)",
                          bgcolor: isDark ? "rgba(16, 185, 129, 0.03)" : "#ffffff",
                          overflow: "hidden",
                          boxShadow: isDark
                            ? "0 2px 8px rgba(0, 0, 0, 0.3)"
                            : "0 2px 8px rgba(16, 185, 129, 0.05)",
                        }}
                      >
                        {/* Header */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            p: 1.25,
                            px: 1.5,
                            bgcolor: isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.08)",
                            borderBottom: "1px solid",
                            borderColor: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <CheckCircleIcon sx={{ fontSize: 17, color: "#10b981" }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.78rem", color: isDark ? "#34d399" : "#15803d" }}>
                              Paid Members
                            </Typography>
                            <Chip
                              size="small"
                              label={`${filteredPaid.length}${memberSearchQuery ? ` / ${paidList.length}` : ""}`}
                              sx={{
                                height: 20,
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                bgcolor: isDark ? "rgba(16, 185, 129, 0.25)" : "#dcfce7",
                                color: isDark ? "#34d399" : "#15803d",
                              }}
                            />
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.78rem", color: isDark ? "#34d399" : "#15803d" }}>
                            {formatWholeCurrency(totalPaid)}
                          </Typography>
                        </Box>

                        {/* List */}
                        <Box
                          sx={{
                            p: 1.25,
                            maxHeight: 280,
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.8,
                          }}
                        >
                          {filteredPaid.length > 0 ? (
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: memberViewTab === "paid" ? { xs: "1fr", sm: "repeat(2, 1fr)" } : "1fr",
                                gap: 0.8,
                              }}
                            >
                              {filteredPaid.map((c) => {
                                const workType = c.workType || getMemberWorkType(c.memberId, c.memberName);
                                const initials = getInitials(c.memberName);
                                const amountVal = Number(c.paidAmount || c.amount || 0);
                                return (
                                  <Box
                                    key={c.memberId || c.contributionId}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      p: 1,
                                      px: 1.25,
                                      borderRadius: "8px",
                                      bgcolor: isDark ? "rgba(16, 185, 129, 0.05)" : "rgba(16, 185, 129, 0.04)",
                                      border: "1px solid",
                                      borderColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                      transition: "all 0.15s ease",
                                      "&:hover": {
                                        bgcolor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.08)",
                                        transform: "translateY(-1px)",
                                      },
                                    }}
                                  >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, pr: 1 }}>
                                      <Avatar
                                        sx={{
                                          width: 28,
                                          height: 28,
                                          fontSize: "0.68rem",
                                          fontWeight: 800,
                                          bgcolor: isDark ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.15)",
                                          color: "#10b981",
                                          border: "1px solid rgba(16, 185, 129, 0.3)",
                                        }}
                                      >
                                        {initials}
                                      </Avatar>
                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                          variant="body2"
                                          noWrap
                                          title={c.memberName}
                                          sx={{
                                            fontWeight: 700,
                                            fontSize: "0.78rem",
                                            color: isDark ? "#ffffff" : "text.primary",
                                          }}
                                        >
                                          {c.memberName}
                                        </Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.2 }}>
                                          <Chip
                                            size="small"
                                            label={workType}
                                            sx={{
                                              height: 16,
                                              fontSize: "0.6rem",
                                              fontWeight: 700,
                                              bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                                              color: "text.secondary",
                                              "& .MuiChip-label": { px: 0.6 },
                                            }}
                                          />
                                          {c.paymentMode && (
                                            <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "text.secondary" }}>
                                              • {c.paymentMode}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Box>
                                    </Box>

                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontWeight: 800,
                                          fontSize: "0.82rem",
                                          color: "#10b981",
                                        }}
                                      >
                                        {formatWholeCurrency(amountVal)}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        label="Paid"
                                        sx={{
                                          height: 18,
                                          fontSize: "0.62rem",
                                          fontWeight: 800,
                                          mt: 0.2,
                                          bgcolor: isDark ? "rgba(16, 185, 129, 0.2)" : "#dcfce7",
                                          color: isDark ? "#34d399" : "#15803d",
                                          "& .MuiChip-label": { px: 0.8 },
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          ) : (
                            <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                              <Typography variant="body2" sx={{ fontSize: "0.75rem", fontStyle: "italic" }}>
                                {memberSearchQuery ? "No paid members match your search" : "No payments received yet"}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {/* Unpaid Members Column */}
                  {(memberViewTab === "split" || memberViewTab === "unpaid") && (
                    <Grid size={{ xs: 12, md: memberViewTab === "split" ? 6 : 12 }}>
                      <Box
                        sx={{
                          borderRadius: "10px",
                          border: "1px solid",
                          borderColor: isDark ? "rgba(244, 63, 94, 0.25)" : "rgba(244, 63, 94, 0.3)",
                          bgcolor: isDark ? "rgba(244, 63, 94, 0.03)" : "#ffffff",
                          overflow: "hidden",
                          boxShadow: isDark
                            ? "0 2px 8px rgba(0, 0, 0, 0.3)"
                            : "0 2px 8px rgba(244, 63, 94, 0.05)",
                        }}
                      >
                        {/* Header */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            p: 1.25,
                            px: 1.5,
                            bgcolor: isDark ? "rgba(244, 63, 94, 0.12)" : "rgba(244, 63, 94, 0.08)",
                            borderBottom: "1px solid",
                            borderColor: isDark ? "rgba(244, 63, 94, 0.2)" : "rgba(244, 63, 94, 0.15)",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <HourglassEmptyIcon sx={{ fontSize: 17, color: "#f43f5e" }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.78rem", color: isDark ? "#fb7185" : "#be123c" }}>
                              Unpaid Members
                            </Typography>
                            <Chip
                              size="small"
                              label={`${filteredUnpaid.length}${memberSearchQuery ? ` / ${unpaidList.length}` : ""}`}
                              sx={{
                                height: 20,
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                bgcolor: isDark ? "rgba(244, 63, 94, 0.25)" : "#ffe4e6",
                                color: isDark ? "#fb7185" : "#be123c",
                              }}
                            />
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.78rem", color: isDark ? "#fb7185" : "#be123c" }}>
                            {formatWholeCurrency(totalUnpaid)}
                          </Typography>
                        </Box>

                        {/* List */}
                        <Box
                          sx={{
                            p: 1.25,
                            maxHeight: 280,
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.8,
                          }}
                        >
                          {filteredUnpaid.length > 0 ? (
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: memberViewTab === "unpaid" ? { xs: "1fr", sm: "repeat(2, 1fr)" } : "1fr",
                                gap: 0.8,
                              }}
                            >
                              {filteredUnpaid.map((c) => {
                                const workType = c.workType || getMemberWorkType(c.memberId, c.memberName);
                                const initials = getInitials(c.memberName);
                                const amountVal = Number(c.amount || 0);
                                return (
                                  <Box
                                    key={c.memberId || c.contributionId}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      p: 1,
                                      px: 1.25,
                                      borderRadius: "8px",
                                      bgcolor: isDark ? "rgba(244, 63, 94, 0.05)" : "rgba(244, 63, 94, 0.04)",
                                      border: "1px solid",
                                      borderColor: isDark ? "rgba(244, 63, 94, 0.15)" : "rgba(244, 63, 94, 0.15)",
                                      transition: "all 0.15s ease",
                                      "&:hover": {
                                        bgcolor: isDark ? "rgba(244, 63, 94, 0.1)" : "rgba(244, 63, 94, 0.08)",
                                        transform: "translateY(-1px)",
                                      },
                                    }}
                                  >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, pr: 1 }}>
                                      <Avatar
                                        sx={{
                                          width: 28,
                                          height: 28,
                                          fontSize: "0.68rem",
                                          fontWeight: 800,
                                          bgcolor: isDark ? "rgba(244, 63, 94, 0.25)" : "rgba(244, 63, 94, 0.15)",
                                          color: "#f43f5e",
                                          border: "1px solid rgba(244, 63, 94, 0.3)",
                                        }}
                                      >
                                        {initials}
                                      </Avatar>
                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                          variant="body2"
                                          noWrap
                                          title={c.memberName}
                                          sx={{
                                            fontWeight: 700,
                                            fontSize: "0.78rem",
                                            color: isDark ? "#ffffff" : "text.primary",
                                          }}
                                        >
                                          {c.memberName}
                                        </Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.2 }}>
                                          <Chip
                                            size="small"
                                            label={workType}
                                            sx={{
                                              height: 16,
                                              fontSize: "0.6rem",
                                              fontWeight: 700,
                                              bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                                              color: "text.secondary",
                                              "& .MuiChip-label": { px: 0.6 },
                                            }}
                                          />
                                        </Box>
                                      </Box>
                                    </Box>

                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontWeight: 800,
                                          fontSize: "0.82rem",
                                          color: "#f43f5e",
                                        }}
                                      >
                                        {formatWholeCurrency(amountVal)}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        label="Pending"
                                        sx={{
                                          height: 18,
                                          fontSize: "0.62rem",
                                          fontWeight: 800,
                                          mt: 0.2,
                                          bgcolor: isDark ? "rgba(244, 63, 94, 0.2)" : "#ffe4e6",
                                          color: isDark ? "#fb7185" : "#be123c",
                                          "& .MuiChip-label": { px: 0.8 },
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          ) : (
                            <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                              <Typography variant="body2" sx={{ fontSize: "0.75rem", fontStyle: "italic" }}>
                                {memberSearchQuery ? "No unpaid members match your search" : "All members have cleared dues! 🎉"}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>
          </Grid>
        </Grid>
      </AppDialog>

      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={COMMON_STRINGS?.DIALOGS?.CONFIRM_TITLE || "Confirm Delete"}
        content={COMMON_STRINGS?.DIALOGS?.DELETE_CONFIRM_MSG || "Are you sure you want to delete this event?"}
        confirmText="Delete"
        confirmColor="error"
      />
    </>
  );
}
