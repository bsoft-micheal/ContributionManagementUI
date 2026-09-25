import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getPaymentTransactionsAsync = async (params) => {
  try {
    return await getApi("/payments/getAllPaymentAsync", params);
  } catch (error) {
    console.error("Error fetching payments:", error.response?.data || error.message);
    throw error;
  }
};

export const getPaymentByIdAsync = async (id) => {
  try {
    return await getApi(`/payments/getPaymentAsyncById/${id}`);
  } catch (error) {
    console.error("Error fetching payment:", error.response?.data || error.message);
    throw error;
  }
};

export const createPaymentTransactionAsync = async (data) => {
  try {
    return await postApi("/payments/savePaymentAsync", data);
  } catch (error) {
    console.error("Error creating payment transaction:", error.response?.data || error.message);
    throw error;
  }
};

export const verifyPaymentTransactionAsync = async (id, data) => {
  try {
    return await putApi(`/payments/verifyPaymentAsync/${id}`, data);
  } catch (error) {
    console.error("Error verifying payment transaction:", error.response?.data || error.message);
    throw error;
  }
};

export const deletePaymentTransactionAsync = async (id) => {
  try {
    return await deleteApi(`/payments/deletePaymentAsyncById/${id}`);
  } catch (error) {
    console.error("Error deleting payment transaction:", error.response?.data || error.message);
    throw error;
  }
};

export const submitPaymentProofAsync = async (data) => {
  try {
    return await postApi("/payments/submitProofAsync", data);
  } catch (error) {
    console.error("Error submitting payment proof:", error.response?.data || error.message);
    throw error;
  }
};

export const getPaymentContextAsync = async (params) => {
  try {
    return await getApi("/payments/getPaymentContextAsync", params);
  } catch (error) {
    console.error("Error loading payment context:", error.response?.data || error.message);
    throw error;
  }
};

