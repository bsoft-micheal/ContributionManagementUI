import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getPaymentTransactionsAsync = async (params) => {
  return await getApi("/payments/getAllPaymentAsync", params);
};

export const getPaymentByIdAsync = async (id) => {
  return await getApi(`/payments/getPaymentAsyncById/${id}`);
};

export const createPaymentTransactionAsync = async (data) => {
  return await postApi("/payments/savePaymentAsync", data);
};

export const verifyPaymentTransactionAsync = async (id, data) => {
  return await putApi(`/payments/verifyPaymentAsync/${id}`, data);
};

export const deletePaymentTransactionAsync = async (id) => {
  return await deleteApi(`/payments/deletePaymentAsyncById/${id}`);
};

export const submitPaymentProofAsync = async (data) => {
  return await postApi("/payments/submitProofAsync", data);
};

export const getPaymentContextAsync = async (params) => {
  return await getApi("/payments/getPaymentContextAsync", params);
};
