import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getTicketTypesAsync = async (activeOnly = false) => {
  const url = activeOnly
    ? "/ticket-types/getAllTicketTypeAsync?activeOnly=true"
    : "/ticket-types/getAllTicketTypeAsync";
  const result = await getApi(url);
  return result || [];
};

export const getTicketTypeByIdAsync = async (id) => {
  return await getApi(`/ticket-types/getTicketTypeAsyncById/${id}`);
};

export const createTicketTypeAsync = async (data) => {
  return await postApi("/ticket-types/saveTicketTypeAsync", data);
};

export const updateTicketTypeAsync = async (id, data) => {
  return await putApi(`/ticket-types/updateTicketTypeAsyncById/${id}`, data);
};

export const deleteTicketTypeAsync = async (id) => {
  return await deleteApi(`/ticket-types/deleteTicketTypeAsyncById/${id}`);
};
