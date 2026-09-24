import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetBudgetCalculationsAsync = async () => {
  try {
    const result = await getApi("/budget-calculations/getAllBudgetCalculationAsync");
    return result || [];
  } catch (error) {
    console.error("Error fetching budget calculations:", error.response?.data || error.message);
    throw error;
  }
};

export const GetBudgetCalculationByIdAsync = async (id) => {
  try {
    const result = await getApi(`/budget-calculations/getBudgetCalculationAsyncById/${id}`);
    return result;
  } catch (error) {
    console.error("Error fetching budget calculation by ID:", error.response?.data || error.message);
    throw error;
  }
};

export const CreateBudgetCalculationAsync = async (data) => {
  try {
    const result = await postApi("/budget-calculations/saveBudgetCalculationAsync", data);
    return result;
  } catch (error) {
    console.error("Error creating budget calculation:", error.response?.data || error.message);
    throw error;
  }
};

export const UpdateBudgetCalculationAsync = async (id, data) => {
  try {
    const result = await putApi(`/budget-calculations/updateBudgetCalculationAsyncById/${id}`, data);
    return result;
  } catch (error) {
    console.error("Error updating budget calculation:", error.response?.data || error.message);
    throw error;
  }
};

export const DeleteBudgetCalculationAsync = async (id) => {
  try {
    const result = await deleteApi(`/budget-calculations/deleteBudgetCalculationAsyncById/${id}`);
    return result;
  } catch (error) {
    console.error("Error deleting budget calculation:", error.response?.data || error.message);
    throw error;
  }
};
