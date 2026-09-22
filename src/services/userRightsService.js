import { getApi, postApi } from "./apiActions";

export const GetUserRightsAsync = async (roleName) => {
  try {
    const result = await getApi(`/user-rights/${roleName}`);
    return result;
  } catch (error) {
    console.error(`Error fetching rights for role ${roleName}:`, error.response?.data || error.message);
    throw error;
  }
};

export const SaveUserRightsAsync = async (data) => {
  try {
    const result = await postApi("/user-rights", data);
    return result;
  } catch (error) {
    console.error("Error saving user rights:", error.response?.data || error.message);
    throw error;
  }
};
