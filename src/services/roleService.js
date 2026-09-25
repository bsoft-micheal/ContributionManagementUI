import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetRolesAsync = async () => {
  return await getApi("/roles/getAllRoleAsync");
};

export const CreateRoleAsync = async (data) => {
  return await postApi("/roles/saveRoleAsync", data);
};

export const UpdateRoleAsync = async (id, data) => {
  return await putApi(`/roles/updateRoleAsyncById/${id}`, data);
};

export const DeleteRoleAsync = async (id) => {
  return await deleteApi(`/roles/deleteRoleAsyncById/${id}`);
};
