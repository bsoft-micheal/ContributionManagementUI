import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetMembersAsync = async () => {
  try {
    const result = await getApi("/members");
    return result;
  } catch (error) {
    console.error('Error fetching members:', error.response?.data || error.message);
    throw error;
  }
};

export const CreateMemberAsync = async (data) => {
  try {
    const result = await postApi("/members", data);
    return result;
  } catch (error) {
    console.error('Error creating member:', error.response?.data || error.message);
    throw error;
  }
};

export const UpdateMemberAsync = async (id, data) => {
  try {
    const result = await putApi(`/members/${id}`, data);
    return result;
  } catch (error) {
    console.error('Error updating member:', error.response?.data || error.message);
    throw error;
  }
};

export const DeleteMemberAsync = async (id) => {
  try {
    const result = await deleteApi(`/members/${id}`);
    return result;
  } catch (error) {
    console.error('Error deleting member:', error.response?.data || error.message);
    throw error;
  }
};

export const CreateMembersBulkAsync = async (data) => {
  try {
    const result = await postApi("/members/bulk", data);
    return result;
  } catch (error) {
    console.error('Error creating members in bulk:', error.response?.data || error.message);
    throw error;
  }
};