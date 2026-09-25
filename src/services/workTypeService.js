import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetWorkTypesAsync = async (activeOnly = false) => {
  try {
    const url = activeOnly
      ? "/work-types/getAllWorkTypeAsync?activeOnly=true"
      : "/work-types/getAllWorkTypeAsync";
    const result = await getApi(url);
    return result || [];
  } catch (error) {
    console.error("Error fetching work types:", error.response?.data || error.message);
    throw error;
  }
};

export const GetWorkTypeByIdAsync = async (id) => {
  try {
    const result = await getApi(`/work-types/getWorkTypeAsyncById/${id}`);
    return result;
  } catch (error) {
    console.error("Error fetching work type by ID:", error.response?.data || error.message);
    throw error;
  }
};

export const CreateWorkTypeAsync = async (data) => {
  try {
    const result = await postApi("/work-types/saveWorkTypeAsync", data);
    return result;
  } catch (error) {
    console.error("Error creating work type:", error.response?.data || error.message);
    throw error;
  }
};

export const UpdateWorkTypeAsync = async (id, data) => {
  try {
    const result = await putApi(`/work-types/updateWorkTypeAsyncById/${id}`, data);
    return result;
  } catch (error) {
    console.error("Error updating work type:", error.response?.data || error.message);
    throw error;
  }
};

export const DeleteWorkTypeAsync = async (id) => {
  try {
    const result = await deleteApi(`/work-types/deleteWorkTypeAsyncById/${id}`);
    return result;
  } catch (error) {
    console.error("Error deleting work type:", error.response?.data || error.message);
    throw error;
  }
};
