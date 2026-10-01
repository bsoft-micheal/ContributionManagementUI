import { getApi, postApi } from "./apiActions";

export const getSystemSettingsAsync = async () => {
  const data = await getApi("/settings/getSettingAsync");
  if (data && typeof data === "object") {
    try {
      const saved = localStorage.getItem("cm_system_settings");
      const parsed = saved ? JSON.parse(saved) : {};
      const isMultiple =
        data.allowedMultipleEvent !== undefined
          ? Boolean(data.allowedMultipleEvent)
          : data.allowMultipleEvents !== undefined
            ? Boolean(data.allowMultipleEvents)
            : parsed.allowedMultipleEvent !== undefined
              ? Boolean(parsed.allowedMultipleEvent)
              : false;

      const merged = {
        ...parsed,
        ...data,
        allowedMultipleEvent: isMultiple,
        allowMultipleEvents: isMultiple,
      };
      localStorage.setItem("cm_system_settings", JSON.stringify(merged));
    } catch { }
  }
  return data;
};

export const updateSystemSettingsAsync = async (data) => {
  let payload = { ...(data || {}) };
  try {
    const saved = localStorage.getItem("cm_system_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      payload = { ...parsed, ...payload };
    }
  } catch { }

  if (data?.allowedMultipleEvent !== undefined) {
    const boolVal = Boolean(data.allowedMultipleEvent);
    payload.allowedMultipleEvent = boolVal;
    payload.allowMultipleEvents = boolVal;
  } else if (data?.allowMultipleEvents !== undefined) {
    const boolVal = Boolean(data.allowMultipleEvents);
    payload.allowedMultipleEvent = boolVal;
    payload.allowMultipleEvents = boolVal;
  }

  const result = await postApi("/settings/updateSettingAsync", payload);

  try {
    const saved = localStorage.getItem("cm_system_settings");
    const parsed = saved ? JSON.parse(saved) : {};
    const finalObj = {
      ...parsed,
      ...payload,
      ...(result && typeof result === "object" ? result : {}),
    };
    if (payload.allowedMultipleEvent !== undefined) {
      finalObj.allowedMultipleEvent = Boolean(payload.allowedMultipleEvent);
      finalObj.allowMultipleEvents = Boolean(payload.allowedMultipleEvent);
    }
    localStorage.setItem("cm_system_settings", JSON.stringify(finalObj));
  } catch { }

  return result;
};

export const resetSystemSettingsAsync = async () => {
  const res = await postApi("/settings/resetSettingAsync", {});
  try {
    localStorage.removeItem("cm_system_settings");
  } catch { }
  return res;
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

export const triggerHangfireRemindersAsync = async () => {
  return await postApi("/settings/triggerRemindersAsync", {});
};

