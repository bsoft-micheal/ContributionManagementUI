import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetTicketTypesAsync = async (activeOnly = false) => {
  const url = activeOnly
    ? "/ticket-types/getAllTicketTypeAsync?activeOnly=true"
    : "/ticket-types/getAllTicketTypeAsync";
  const result = await getApi(url);
  return result || [];
};

export const GetTicketTypeByIdAsync = async (id) => {
  return await getApi(`/ticket-types/getTicketTypeAsyncById/${id}`);
};

export const CreateTicketTypeAsync = async (data) => {
  return await postApi("/ticket-types/saveTicketTypeAsync", data);
};

export const UpdateTicketTypeAsync = async (id, data) => {
  return await putApi(`/ticket-types/updateTicketTypeAsyncById/${id}`, data);
};

export const DeleteTicketTypeAsync = async (id) => {
  return await deleteApi(`/ticket-types/deleteTicketTypeAsyncById/${id}`);
};
