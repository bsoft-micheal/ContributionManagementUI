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

export const updateBudgetCalculationRateAsync = async (id, data) => {
  try {
    return await putApi(`/budget-calculations/updateRateAsyncById/${id}`, data);
  } catch (err) {
    if (err?.response?.status === 404) {
      return await putApi(`/budget-calculations/updateBudgetCalculationAsyncById/${id}`, data);
    }
    throw err;
  }
};

export const getBudgetCalculationHistoryAsync = async (id) => {
  try {
    const result = await getApi(`/budget-calculations/getBudgetCalculationHistoryAsyncById/${id}`);
    return result || [];
  } catch (err) {
    if (err?.response?.status === 404) {
      const alt = await getApi(`/budget-calculations/${id}/history`);
      return alt || [];
    }
    throw err;
  }
};

export const deleteBudgetCalculationAsync = async (id) => {
  return await deleteApi(`/budget-calculations/deleteBudgetCalculationAsyncById/${id}`);
};

