import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetRoles = async () => {
  try {
    const result = await getApi("/roles");
    return result;
  } catch (error) {
    console.error('Error fetching roles:', error.response?.data || error.message);
    throw error;
  }
};

export const CreateRole = async (data) => {
  try {
    const result = await postApi("/roles", data);
    return result;
  } catch (error) {
    console.error('Error creating role:', error.response?.data || error.message);
    throw error;
  }
};

export const UpdateRole = async (id, data) => {
  try {
    const result = await putApi(`/roles/${id}`, data);
    return result;
  } catch (error) {
    console.error('Error updating role:', error.response?.data || error.message);
    throw error;
  }
};

export const DeleteRole = async (id) => {
  try {
    const result = await deleteApi(`/roles/${id}`);
    return result;
  } catch (error) {
    console.error('Error deleting role:', error.response?.data || error.message);
    throw error;
  }
};
