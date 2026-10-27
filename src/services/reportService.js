import apiClient from "./apiClient";

export async function getReportsSummaryAsync(month = null, year = null) {
  const params = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const { data } = await apiClient.get("/reports/getSummaryReportAsync", { params });
  return data?.data !== undefined ? data.data : data;
}

export async function getPendingDuesReportAsync(month = null, year = null, eventTypeId = null, eventId = null) {
  const params = {};
  if (month && month !== 0) params.month = month;
  if (year && year !== 0) params.year = year;
  if (eventTypeId && eventTypeId !== "ALL") params.eventTypeId = eventTypeId;
  if (eventId && eventId !== "ALL") params.eventId = eventId;
  const { data } = await apiClient.get("/reports/getPendingDuesReportAsync", { params });
  return data?.data !== undefined ? data.data : data;
}
