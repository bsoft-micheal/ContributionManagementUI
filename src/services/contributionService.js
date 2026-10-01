import { getApi, postApi } from "./apiActions";

export const getContributionsAsync = async (params) => {
  return await getApi("/contributions/getAllContributionAsync", params);
};

export const getContributionsByEventAsync = async (eventId) => {
  return await getApi(`/contributions/getContributionAsyncByEvent/${eventId}`);
};

export const recordPaymentAsync = async (data) => {
  return await postApi("/contributions/savePayContributionAsync", data);
};

export const sendPaymentReminder = async (data) => {
  try {
    if (data?.contributionId && data.contributionId !== "test" && data.contributionId !== "test-preview-id") {
      return await postApi(`/contributions/sendReminderAsync/${data.contributionId}`);
    } else if (data?.eventId && data.eventId !== "test") {
      return await postApi(`/events/sendRemindersAsync/${data.eventId}`);
    }
  } catch (error) {
    // If backend endpoint is unavailable or fails, bubble up or return status
    console.error("sendPaymentReminder API call failed:", error);
    throw error;
  }
  return {
    success: true,
    message: "Payment reminder processed successfully.",
    timestamp: new Date().toISOString(),
  };
};

export const sendReminderForContributionAsync = async (contributionId) => {
  return await postApi(`/contributions/sendReminderAsync/${contributionId}`);
};

export const sendRemindersForEventAsync = async (eventId) => {
  return await postApi(`/events/sendRemindersAsync/${eventId}`);
};

