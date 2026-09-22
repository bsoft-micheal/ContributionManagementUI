import { getApi } from "./apiActions";

export const GetDashboardSummaryAsync = async (params) => {
  try {
    let apiParams = undefined;
    if (params && (params.month !== undefined || params.year !== undefined)) {
      apiParams = {
        month: params.month === 0 ? null : params.month,
        year: params.year === 0 ? null : params.year,
      };
    }
    const result = await getApi("/dashboard/getSummaryDashboardAsync", apiParams);
    return result;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error.response?.data || error.message);
    throw error;
  }
};
