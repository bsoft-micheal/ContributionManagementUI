import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getSupportTicketsAsync = async (params) => {
  return await getApi("/support-tickets/getAllSupportTicketAsync", params);
};

export const getSupportTicketByIdAsync = async (id) => {
  return await getApi(`/support-tickets/getSupportTicketAsyncById/${id}`);
};

export const createSupportTicketAsync = async (data) => {
  return await postApi("/support-tickets/saveSupportTicketAsync", data);
};

export const updateSupportTicketAsync = async (id, data) => {
  return await putApi(`/support-tickets/updateSupportTicketAsyncById/${id}`, data);
};

export const replySupportTicketAsync = async (id, data) => {
  return await postApi(`/support-tickets/replySupportTicketAsync/${id}`, data);
};

export const deleteSupportTicketAsync = async (id) => {
  return await deleteApi(`/support-tickets/deleteSupportTicketAsyncById/${id}`);
};
