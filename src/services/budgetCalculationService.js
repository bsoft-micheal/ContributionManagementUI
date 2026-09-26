import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getBudgetCalculationsAsync = async () => {
  const result = await getApi("/budget-calculations/getAllBudgetCalculationAsync");
  return result || [];
};

export const getBudgetCalculationByIdAsync = async (id) => {
  return await getApi(`/budget-calculations/getBudgetCalculationAsyncById/${id}`);
};

export const createBudgetCalculationAsync = async (data) => {
  return await postApi("/budget-calculations/saveBudgetCalculationAsync", data);
};

export const updateBudgetCalculationAsync = async (id, data) => {
  return await putApi(`/budget-calculations/updateBudgetCalculationAsyncById/${id}`, data);
};

export const deleteBudgetCalculationAsync = async (id) => {
  return await deleteApi(`/budget-calculations/deleteBudgetCalculationAsyncById/${id}`);
};
