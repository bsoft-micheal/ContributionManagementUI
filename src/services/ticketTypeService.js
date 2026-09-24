import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetTicketTypesAsync = async (activeOnly = false) => {
  try {
    const url = activeOnly
      ? "/ticket-types/getAllTicketTypeAsync?activeOnly=true"
      : "/ticket-types/getAllTicketTypeAsync";
    const result = await getApi(url);
    return result || [];
  } catch (error) {
    console.error("Error fetching ticket types:", error.response?.data || error.message);
    throw error;
  }
};

export const GetTicketTypeByIdAsync = async (id) => {
  try {
    const result = await getApi(`/ticket-types/getTicketTypeAsyncById/${id}`);
    return result;
  } catch (error) {
    console.error("Error fetching ticket type by ID:", error.response?.data || error.message);
    throw error;
  }
};

export const CreateTicketTypeAsync = async (data) => {
  try {
    const result = await postApi("/ticket-types/saveTicketTypeAsync", data);
    return result;
  } catch (error) {
    console.error("Error creating ticket type:", error.response?.data || error.message);
    throw error;
  }
};

export const UpdateTicketTypeAsync = async (id, data) => {
  try {
    const result = await putApi(`/ticket-types/updateTicketTypeAsyncById/${id}`, data);
    return result;
  } catch (error) {
    console.error("Error updating ticket type:", error.response?.data || error.message);
    throw error;
  }
};

export const DeleteTicketTypeAsync = async (id) => {
  try {
    const result = await deleteApi(`/ticket-types/deleteTicketTypeAsyncById/${id}`);
    return result;
  } catch (error) {
    console.error("Error deleting ticket type:", error.response?.data || error.message);
    throw error;
  }
};
