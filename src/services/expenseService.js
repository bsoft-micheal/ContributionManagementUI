import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getExpensesAsync = async (params) => {
  return await getApi("/expenses/getAllExpenseAsync", params);
};

export const getExpenseByIdAsync = async (id) => {
  return await getApi(`/expenses/getExpenseAsyncById/${id}`);
};

export const createExpenseAsync = async (data) => {
  return await postApi("/expenses/saveExpenseAsync", data);
};

export const updateExpenseAsync = async (id, data) => {
  return await putApi(`/expenses/updateExpenseAsyncById/${id}`, data);
};

export const deleteExpenseAsync = async (id) => {
  return await deleteApi(`/expenses/deleteExpenseAsyncById/${id}`);
};

