import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getPrioritiesAsync = async (activeOnly = false) => {
  const url = activeOnly
    ? "/priorities/getAllPriorityAsync?activeOnly=true"
    : "/priorities/getAllPriorityAsync";
  const result = await getApi(url);
  return result || [];
};

export const getPriorityByIdAsync = async (id) => {
  return await getApi(`/priorities/getPriorityAsyncById/${id}`);
};

export const createPriorityAsync = async (data) => {
  return await postApi("/priorities/savePriorityAsync", data);
};

export const updatePriorityAsync = async (id, data) => {
  return await putApi(`/priorities/updatePriorityAsyncById/${id}`, data);
};

export const deletePriorityAsync = async (id) => {
  return await deleteApi(`/priorities/deletePriorityAsyncById/${id}`);
};
