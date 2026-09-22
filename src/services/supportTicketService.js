import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getSupportTickets = async (params) => {
  try {
    return await getApi("/support-tickets", params);
  } catch (error) {
    console.error("Error fetching support tickets:", error.response?.data || error.message);
    throw error;
  }
};

export const getSupportTicketById = async (id) => {
  try {
    return await getApi(`/support-tickets/${id}`);
  } catch (error) {
    console.error("Error fetching support ticket:", error.response?.data || error.message);
    throw error;
  }
};

export const createSupportTicket = async (data) => {
  try {
    return await postApi("/support-tickets", data);
  } catch (error) {
    console.error("Error creating support ticket:", error.response?.data || error.message);
    throw error;
  }
};

export const updateSupportTicket = async (id, data) => {
  try {
    return await putApi(`/support-tickets/${id}`, data);
  } catch (error) {
    console.error("Error updating support ticket:", error.response?.data || error.message);
    throw error;
  }
};

export const replySupportTicket = async (id, data) => {
  try {
    return await postApi(`/support-tickets/${id}/reply`, data);
  } catch (error) {
    console.error("Error replying to ticket:", error.response?.data || error.message);
    throw error;
  }
};

export const deleteSupportTicket = async (id) => {
  try {
    return await deleteApi(`/support-tickets/${id}`);
  } catch (error) {
    console.error("Error deleting ticket:", error.response?.data || error.message);
    throw error;
  }
};
