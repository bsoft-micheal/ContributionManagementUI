import { getApi, postApi } from "./apiActions";

export const getSystemSettings = async () => {
  try {
    return await getApi("/settings");
  } catch (error) {
    console.error("Error fetching settings:", error.response?.data || error.message);
    throw error;
  }
};

export const updateSystemSettings = async (data) => {
  try {
    return await postApi("/settings", data);
  } catch (error) {
    console.error("Error updating settings:", error.response?.data || error.message);
    throw error;
  }
};

export const resetSystemSettings = async () => {
  try {
    return await postApi("/settings/reset", {});
  } catch (error) {
    console.error("Error resetting settings:", error.response?.data || error.message);
    throw error;
  }
};
