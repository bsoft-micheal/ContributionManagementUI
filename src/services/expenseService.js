import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getExpensesAsync = async (params) => {
  try {
    return await getApi("/expenses", params);
  } catch (error) {
    console.error("Error fetching expenses:", error.response?.data || error.message);
    throw error;
  }
};

export const getExpenseByIdAsync = async (id) => {
  try {
    return await getApi(`/expenses/${id}`);
  } catch (error) {
    console.error("Error fetching expense:", error.response?.data || error.message);
    throw error;
  }
};

export const createExpenseAsync = async (data) => {
  try {
    return await postApi("/expenses", data);
  } catch (error) {
    console.error("Error creating expense:", error.response?.data || error.message);
    throw error;
  }
};

export const updateExpenseAsync = async (id, data) => {
  try {
    return await putApi(`/expenses/${id}`, data);
  } catch (error) {
    console.error("Error updating expense:", error.response?.data || error.message);
    throw error;
  }
};

export const deleteExpenseAsync = async (id) => {
  try {
    return await deleteApi(`/expenses/${id}`);
  } catch (error) {
    console.error("Error deleting expense:", error.response?.data || error.message);
    throw error;
  }
};
