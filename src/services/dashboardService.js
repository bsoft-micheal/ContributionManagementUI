import { getApi } from "./apiActions";

export const GetDashboardSummary = async (params) => {
  try {
    const result = await getApi("/dashboard/summary", params);
    return result;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error.response?.data || error.message);
    throw error;
  }
};
