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
  return {
    success: true,
    message: "Payment reminder processed successfully.",
    timestamp: new Date().toISOString(),
  };
};
