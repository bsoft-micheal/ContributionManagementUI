import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetBudgetCalculationsAsync = async () => {
  const result = await getApi("/budget-calculations/getAllBudgetCalculationAsync");
  return result || [];
};

export const GetBudgetCalculationByIdAsync = async (id) => {
  return await getApi(`/budget-calculations/getBudgetCalculationAsyncById/${id}`);
};

export const CreateBudgetCalculationAsync = async (data) => {
  return await postApi("/budget-calculations/saveBudgetCalculationAsync", data);
};

export const UpdateBudgetCalculationAsync = async (id, data) => {
  return await putApi(`/budget-calculations/updateBudgetCalculationAsyncById/${id}`, data);
};

export const DeleteBudgetCalculationAsync = async (id) => {
  return await deleteApi(`/budget-calculations/deleteBudgetCalculationAsyncById/${id}`);
};
