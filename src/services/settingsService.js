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

export const getAllPaymentQrSettingsAsync = async () => {
  try {
    return await getApi("/settings/getAllPaymentQrSettingsAsync");
  } catch (error) {
    console.warn("Could not fetch payment QR settings from API, using cached:", error.response?.data || error.message);
    return null;
  }
};

export const getPaymentQrSettingByEventTypeAsync = async (eventType) => {
  try {
    return await getApi(`/settings/getPaymentQrSettingsAsync?eventType=${encodeURIComponent(eventType)}`);
  } catch (error) {
    console.warn(`Could not fetch payment QR setting for ${eventType} from API:`, error.response?.data || error.message);
    return null;
  }
};

export const savePaymentQrSettingAsync = async (data) => {
  try {
    return await postApi("/settings/savePaymentQrSettingAsync", data);
  } catch (error) {
    console.warn("Error saving payment QR setting to dedicated endpoint, falling back to updateSettingAsync:", error.response?.data || error.message);
    try {
      return await updateSystemSettingsAsync(data);
    } catch {
      return null;
    }
  }
};

// Aliases for compatibility
export const getSystemSettings = getSystemSettingsAsync;
export const updateSystemSettings = updateSystemSettingsAsync;
export const resetSystemSettings = resetSystemSettingsAsync;

