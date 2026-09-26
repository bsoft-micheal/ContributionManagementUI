import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetPrioritiesAsync = async (activeOnly = false) => {
  const url = activeOnly
    ? "/priorities/getAllPriorityAsync?activeOnly=true"
    : "/priorities/getAllPriorityAsync";
  const result = await getApi(url);
  return result || [];
};

export const GetPriorityByIdAsync = async (id) => {
  return await getApi(`/priorities/getPriorityAsyncById/${id}`);
};

export const CreatePriorityAsync = async (data) => {
  return await postApi("/priorities/savePriorityAsync", data);
};

export const UpdatePriorityAsync = async (id, data) => {
  return await putApi(`/priorities/updatePriorityAsyncById/${id}`, data);
};

export const DeletePriorityAsync = async (id) => {
  return await deleteApi(`/priorities/deletePriorityAsyncById/${id}`);
};
