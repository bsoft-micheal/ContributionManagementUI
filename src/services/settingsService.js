import { getApi, postApi } from "./apiActions";

export const getSystemSettingsAsync = async () => {
  return await getApi("/settings/getSettingAsync");
};

export const updateSystemSettingsAsync = async (data) => {
  return await postApi("/settings/updateSettingAsync", data);
};

export const resetSystemSettingsAsync = async () => {
  return await postApi("/settings/resetSettingAsync", {});
};

export const getAllPaymentQrSettingsAsync = async () => {
  try {
    return await getApi("/settings/getAllPaymentQrSettingsAsync");
  } catch {
    return null;
  }
};

export const getPaymentQrSettingByEventTypeAsync = async (eventType) => {
  try {
    return await getApi(`/settings/getPaymentQrSettingsAsync?eventType=${encodeURIComponent(eventType)}`);
  } catch {
    return null;
  }
};

export const savePaymentQrSettingAsync = async (data) => {
  try {
    return await postApi("/settings/savePaymentQrSettingAsync", data);
  } catch {
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

