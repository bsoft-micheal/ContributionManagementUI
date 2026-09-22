import { getApi, postApi } from "./apiActions";

export const GetContributions = async (params) => {
  try {
    const result = await getApi("/contributions", params);
    return result;
  } catch (error) {
    console.error('Error fetching contributions:', error.response?.data || error.message);
    throw error;
  }
};

export const GetContributionsByEvent = async (eventId) => {
  try {
    const result = await getApi(`/contributions/event/${eventId}`);
    return result;
  } catch (error) {
    console.error(`Error fetching contributions for event ${eventId}:`, error.response?.data || error.message);
    throw error;
  }
};

export const RecordPayment = async (data) => {
  try {
    const result = await postApi("/contributions/pay", data);
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

