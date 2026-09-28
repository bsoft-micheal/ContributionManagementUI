import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getPaymentModesAsync = async (activeOnly = false) => {
  const url = activeOnly
    ? "/payment-modes/getAllPaymentModeAsync?activeOnly=true"
    : "/payment-modes/getAllPaymentModeAsync";
  const result = await getApi(url);
  return result || [];
};

export const getPaymentModeByIdAsync = async (id) => {
  return await getApi(`/payment-modes/getPaymentModeAsyncById/${id}`);
};

export const createPaymentModeAsync = async (data) => {
  return await postApi("/payment-modes/savePaymentModeAsync", data);
};

export const updatePaymentModeAsync = async (id, data) => {
  return await putApi(`/payment-modes/updatePaymentModeAsyncById/${id}`, data);
};

export const deletePaymentModeAsync = async (id) => {
  return await deleteApi(`/payment-modes/deletePaymentModeAsyncById/${id}`);
};
