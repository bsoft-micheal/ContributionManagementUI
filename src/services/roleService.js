import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetRolesAsync = async () => {
  try {
    const result = await getApi("/roles/getAllRoleAsync");
    return result;
  } catch (error) {
    console.error('Error fetching roles:', error.response?.data || error.message);
    throw error;
  }
};

export const CreateRoleAsync = async (data) => {
  try {
    const result = await postApi("/roles/saveRoleAsync", data);
    return result;
  } catch (error) {
    console.error('Error creating role:', error.response?.data || error.message);
    throw error;
  }
};

export const UpdateRoleAsync = async (id, data) => {
  try {
    const result = await putApi(`/roles/updateRoleAsyncById/${id}`, data);
    return result;
  } catch (error) {
    console.error('Error updating role:', error.response?.data || error.message);
    throw error;
  }
};

export const DeleteRoleAsync = async (id) => {
  try {
    const result = await deleteApi(`/roles/deleteRoleAsyncById/${id}`);
    return result;
  } catch (error) {
    console.error('Error deleting role:', error.response?.data || error.message);
    throw error;
  }
};
