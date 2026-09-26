import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getWorkTypesAsync = async (activeOnly = false) => {
  const url = activeOnly
    ? "/work-types/getAllWorkTypeAsync?activeOnly=true"
    : "/work-types/getAllWorkTypeAsync";
  const result = await getApi(url);
  return result || [];
};

export const getWorkTypeByIdAsync = async (id) => {
  return await getApi(`/work-types/getWorkTypeAsyncById/${id}`);
};

export const createWorkTypeAsync = async (data) => {
  return await postApi("/work-types/saveWorkTypeAsync", data);
};

export const updateWorkTypeAsync = async (id, data) => {
  return await putApi(`/work-types/updateWorkTypeAsyncById/${id}`, data);
};

export const deleteWorkTypeAsync = async (id) => {
  return await deleteApi(`/work-types/deleteWorkTypeAsyncById/${id}`);
};
