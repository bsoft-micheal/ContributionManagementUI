import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getStatusesAsync = async (activeOnly = false) => {
  const url = activeOnly
    ? "/statuses/getAllStatusAsync?activeOnly=true"
    : "/statuses/getAllStatusAsync";
  const result = await getApi(url);
  return result || [];
};

export const getStatusByIdAsync = async (id) => {
  return await getApi(`/statuses/getStatusAsyncById/${id}`);
};

export const createStatusAsync = async (data) => {
  return await postApi("/statuses/saveStatusAsync", data);
};

export const updateStatusAsync = async (id, data) => {
  return await putApi(`/statuses/updateStatusAsyncById/${id}`, data);
};

export const deleteStatusAsync = async (id) => {
  return await deleteApi(`/statuses/deleteStatusAsyncById/${id}`);
};
