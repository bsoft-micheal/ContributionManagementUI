import { getApi, postApi } from "./apiActions";

export const getSystemSettingsAsync = async () => {
  try {
    return await getApi("/settings");
  } catch (error) {
    console.error("Error fetching settings:", error.response?.data || error.message);
    throw error;
  }
};

export const updateSystemSettingsAsync = async (data) => {
  try {
    return await postApi("/settings", data);
  } catch (error) {
    console.error("Error updating settings:", error.response?.data || error.message);
    throw error;
  }
};

export const resetSystemSettingsAsync = async () => {
  try {
    return await postApi("/settings/reset", {});
  } catch (error) {
    console.error("Error resetting settings:", error.response?.data || error.message);
    throw error;
  }
};
