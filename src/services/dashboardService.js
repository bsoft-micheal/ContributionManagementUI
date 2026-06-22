import { getApi } from "./apiActions";

export const GetDashboardSummary = async (params) => {
  try {
    const apiParams = {
      month: params.month === 0 ? null : params.month,
      year: params.year === 0 ? null : params.year,
    };
    const result = await getApi("/dashboard/summary", apiParams);
    return result;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error.response?.data || error.message);
    throw error;
  }
};
