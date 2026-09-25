import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetWorkTypesAsync = async (activeOnly = false) => {
  const url = activeOnly
    ? "/work-types/getAllWorkTypeAsync?activeOnly=true"
    : "/work-types/getAllWorkTypeAsync";
  const result = await getApi(url);
  return result || [];
};

export const GetWorkTypeByIdAsync = async (id) => {
  return await getApi(`/work-types/getWorkTypeAsyncById/${id}`);
};

export const CreateWorkTypeAsync = async (data) => {
  return await postApi("/work-types/saveWorkTypeAsync", data);
};

export const UpdateWorkTypeAsync = async (id, data) => {
  return await putApi(`/work-types/updateWorkTypeAsyncById/${id}`, data);
};

export const DeleteWorkTypeAsync = async (id) => {
  return await deleteApi(`/work-types/deleteWorkTypeAsyncById/${id}`);
};
