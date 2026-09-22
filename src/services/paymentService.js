import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getPaymentTransactions = async (params) => {
  try {
    return await getApi("/payments", params);
  } catch (error) {
    console.error("Error fetching payments:", error.response?.data || error.message);
    throw error;
  }
};

export const getPaymentById = async (id) => {
  try {
    return await getApi(`/payments/${id}`);
  } catch (error) {
    console.error("Error fetching payment:", error.response?.data || error.message);
    throw error;
  }
};

export const createPaymentTransaction = async (data) => {
  try {
    return await postApi("/payments", data);
  } catch (error) {
    console.error("Error creating payment transaction:", error.response?.data || error.message);
    throw error;
  }
};

export const verifyPaymentTransaction = async (id, data) => {
  try {
    return await putApi(`/payments/${id}/verify`, data);
  } catch (error) {
    console.error("Error verifying payment transaction:", error.response?.data || error.message);
    throw error;
  }
};

export const deletePaymentTransaction = async (id) => {
  try {
    return await deleteApi(`/payments/${id}`);
  } catch (error) {
    console.error("Error deleting payment transaction:", error.response?.data || error.message);
    throw error;
  }
};
