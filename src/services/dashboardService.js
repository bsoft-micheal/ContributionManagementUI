import { getApi } from "./apiActions";

export const GetDashboardSummaryAsync = async (params) => {
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
