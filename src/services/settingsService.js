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
  return [];
};

export const getPaymentQrSettingByEventTypeAsync = async (eventType) => {
  return null;
};

export const savePaymentQrSettingAsync = async (data) => {
  try {
    return await updateSystemSettingsAsync({
      qrReceiverName: data.receiverName || data.qrReceiverName,
      qrUpiId: data.upiId || data.qrUpiId,
      qrImage: data.qrCodeImage || data.qrImage,
    });
  } catch {
    return null;
  }
};

// Aliases for compatibility
export const getSystemSettings = getSystemSettingsAsync;
export const updateSystemSettings = updateSystemSettingsAsync;
export const resetSystemSettings = resetSystemSettingsAsync;

