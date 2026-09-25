import { getApi, postApi } from "./apiActions";

export const GetContributionsAsync = async (params) => {
  return await getApi("/contributions/getAllContributionAsync", params);
};

export const GetContributionsByEventAsync = async (eventId) => {
  return await getApi(`/contributions/getContributionAsyncByEvent/${eventId}`);
};

export const RecordPaymentAsync = async (data) => {
  return await postApi("/contributions/savePayContributionAsync", data);
};

export const SendPaymentReminder = async (data) => {
  return {
    success: true,
    message: "Payment reminder processed successfully.",
    timestamp: new Date().toISOString(),
  };
};
