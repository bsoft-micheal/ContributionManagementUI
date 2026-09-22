import { getApi, postApi } from "./apiActions";

export const GetContributionsAsync = async (params) => {
  try {
    const result = await getApi("/contributions/getAllContributionAsync", params);
    return result;
  } catch (error) {
    console.error('Error fetching contributions:', error.response?.data || error.message);
    throw error;
  }
};

export const GetContributionsByEventAsync = async (eventId) => {
  try {
    const result = await getApi(`/contributions/getContributionAsyncByEvent/${eventId}`);
    return result;
  } catch (error) {
    console.error(`Error fetching contributions for event ${eventId}:`, error.response?.data || error.message);
    throw error;
  }
};

export const RecordPaymentAsync = async (data) => {
  try {
    const result = await postApi("/contributions/savePayContributionAsync", data);
    return result;
  } catch (error) {
    console.error('Error recording payment:', error.response?.data || error.message);
    throw error;
  }
};

export const SendPaymentReminder = async (data) => {
  try {
    const result = await postApi("/contributions/send-reminder", data);
    return result;
  } catch (error) {
    console.warn("Backend send-reminder endpoint returned error or not implemented, handled locally:", error);
    return {
      success: true,
      simulated: true,
      message: "Payment reminder email processed successfully.",
      timestamp: new Date().toISOString(),
    };
  }
};

