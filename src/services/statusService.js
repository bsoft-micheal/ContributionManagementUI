import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetStatusesAsync = async (activeOnly = false) => {
  try {
    const url = activeOnly
      ? "/statuses/getAllStatusAsync?activeOnly=true"
      : "/statuses/getAllStatusAsync";
    const result = await getApi(url);
    return result || [];
  } catch (error) {
    console.error("Error fetching statuses:", error.response?.data || error.message);
    throw error;
  }
};

export const GetStatusByIdAsync = async (id) => {
  try {
    const result = await getApi(`/statuses/getStatusAsyncById/${id}`);
    return result;
  } catch (error) {
    console.error("Error fetching status by ID:", error.response?.data || error.message);
    throw error;
  }
};

export const CreateStatusAsync = async (data) => {
  try {
    const result = await postApi("/statuses/saveStatusAsync", data);
    return result;
  } catch (error) {
    console.error("Error creating status:", error.response?.data || error.message);
    throw error;
  }
};

export const UpdateStatusAsync = async (id, data) => {
  try {
    const result = await putApi(`/statuses/updateStatusAsyncById/${id}`, data);
    return result;
  } catch (error) {
    console.error("Error updating status:", error.response?.data || error.message);
    throw error;
  }
};

export const DeleteStatusAsync = async (id) => {
  try {
    const result = await deleteApi(`/statuses/deleteStatusAsyncById/${id}`);
    return result;
  } catch (error) {
    console.error("Error deleting status:", error.response?.data || error.message);
    throw error;
  }
};
