import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getRolesAsync = async () => {
  return await getApi("/roles/getAllRoleAsync");
};

export const createRoleAsync = async (data) => {
  return await postApi("/roles/saveRoleAsync", data);
};

export const updateRoleAsync = async (id, data) => {
  return await putApi(`/roles/updateRoleAsyncById/${id}`, data);
};

export const deleteRoleAsync = async (id) => {
  return await deleteApi(`/roles/deleteRoleAsyncById/${id}`);
};
