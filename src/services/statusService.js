import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetStatusesAsync = async (activeOnly = false) => {
  const url = activeOnly
    ? "/statuses/getAllStatusAsync?activeOnly=true"
    : "/statuses/getAllStatusAsync";
  const result = await getApi(url);
  return result || [];
};

export const GetStatusByIdAsync = async (id) => {
  return await getApi(`/statuses/getStatusAsyncById/${id}`);
};

export const CreateStatusAsync = async (data) => {
  return await postApi("/statuses/saveStatusAsync", data);
};

export const UpdateStatusAsync = async (id, data) => {
  return await putApi(`/statuses/updateStatusAsyncById/${id}`, data);
};

export const DeleteStatusAsync = async (id) => {
  return await deleteApi(`/statuses/deleteStatusAsyncById/${id}`);
};
