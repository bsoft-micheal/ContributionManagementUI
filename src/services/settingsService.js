import { getApi, postApi } from "./apiActions";

export const getSystemSettingsAsync = async () => {
  try {
    return await getApi("/settings/getSettingAsync");
  } catch (error) {
    console.error("Error fetching settings:", error.response?.data || error.message);
    throw error;
  }
};

export const updateSystemSettingsAsync = async (data) => {
  try {
    return await postApi("/settings/updateSettingAsync", data);
  } catch (error) {
    console.error("Error updating settings:", error.response?.data || error.message);
    throw error;
  }
};

export const resetSystemSettingsAsync = async () => {
  try {
    return await postApi("/settings/resetSettingAsync", {});
  } catch (error) {
    console.error("Error resetting settings:", error.response?.data || error.message);
    throw error;
  }
};

// Aliases for compatibility
export const getSystemSettings = getSystemSettingsAsync;
export const updateSystemSettings = updateSystemSettingsAsync;
export const resetSystemSettings = resetSystemSettingsAsync;

