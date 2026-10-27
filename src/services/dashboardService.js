import { getApi } from "./apiActions";

export const getDashboardSummaryAsync = async (params) => {
  const apiParams = {};
  if (params?.month && Number(params.month) > 0) {
    apiParams.month = Number(params.month);
  }
  if (params?.year && Number(params.year) > 0) {
    apiParams.year = Number(params.year);
  }
  const result = await getApi(
    "/dashboard/getSummaryDashboardAsync",
    Object.keys(apiParams).length > 0 ? apiParams : undefined
  );
  return result;
};

export const getMemberDashboardSummaryAsync = async (params) => {
  const apiParams = {};
  if (params?.month && Number(params.month) > 0) {
    apiParams.month = Number(params.month);
  }
  if (params?.year && Number(params.year) > 0) {
    apiParams.year = Number(params.year);
  }
  return await getApi(
    "/dashboard/member/summary",
    Object.keys(apiParams).length > 0 ? apiParams : undefined
  );
};

export const getMemberContributionsAsync = async (params) => {
  const apiParams = {};
  if (params?.month && Number(params.month) > 0) {
    apiParams.month = Number(params.month);
  }
  if (params?.year && Number(params.year) > 0) {
    apiParams.year = Number(params.year);
  }
  if (params?.eventTypeId && params.eventTypeId !== "ALL") {
    apiParams.eventTypeId = params.eventTypeId;
  }
  return await getApi(
    "/dashboard/member/contributions",
    Object.keys(apiParams).length > 0 ? apiParams : undefined
  );
};

export const getMemberRecentPaymentsAsync = async (limit = 5) => {
  return await getApi("/dashboard/member/recent-payments", { limit });
};
