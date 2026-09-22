import { getApi, postApi } from "./apiActions";

export const GetContributionsAsync = async (params) => {
  try {
    const result = await getApi("/contributions", params);
    return result;
  } catch (error) {
    console.error('Error fetching contributions:', error.response?.data || error.message);
    throw error;
  }
};

export const GetContributionsByEventAsync = async (eventId) => {
  try {
    const result = await getApi(`/contributions/event/${eventId}`);
    return result;
  } catch (error) {
    console.error(`Error fetching contributions for event ${eventId}:`, error.response?.data || error.message);
    throw error;
  }
};

export const RecordPaymentAsync = async (data) => {
  try {
    const result = await postApi("/contributions/pay", data);
    return result;
  } catch (error) {
    console.error('Error recording payment:', error.response?.data || error.message);
    throw error;
  }
};
