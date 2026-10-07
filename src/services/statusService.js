import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getStatusesAsync = async (activeOnly = false, module = "") => {
  const params = new URLSearchParams();
  if (activeOnly) params.append("activeOnly", "true");
  if (module && module !== "ALL") params.append("module", module);
  const queryStr = params.toString();
  const url = queryStr ? `/statuses/getAllStatusAsync?${queryStr}` : "/statuses/getAllStatusAsync";
  const result = await getApi(url);
  return result || [];
};

export const getAllModuleAsync = async () => {
  try {
    const result = await getApi("/statuses/getAllModuleAsync");
    if (Array.isArray(result) && result.length > 0) return result;
  } catch (e) {
    // fallback
  }
  try {
    const result = await getApi("/statuses/getModulesAsync");
    if (Array.isArray(result) && result.length > 0) return result;
  } catch (e) {
    // fallback
  }
  return [];
};

export const getModulesAsync = async () => {
  return await getAllModuleAsync();
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
