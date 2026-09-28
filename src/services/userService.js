import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getUsersAsync = async () => {
  return await getApi("/users/getAllUserAsync");
};

export const createUserAsync = async (data) => {
  return await postApi("/users/saveUserAsync", data);
};

export const updateUserAsync = async (id, data) => {
  return await putApi(`/users/updateUserAsyncById/${id}`, data);
};

export const deleteUserAsync = async (id) => {
  return await deleteApi(`/users/deleteUserAsyncById/${id}`);
};

export const createUsersBulkAsync = async (data) => {
  return await postApi("/users/saveBulkUserAsync", data);
};

export const resetUserPasswordAsync = async (id, data) => {
  return await putApi(`/users/updateUserAsyncById/${id}`, data);
};

export const requestForgotPasswordOtpAsync = async (email) => {
  return await postApi("/auth/forgot-password/requestAsync", { email });
};

export const verifyForgotPasswordOtpAsync = async (email, otp) => {
  return await postApi("/auth/forgot-password/verifyAsync", { email, otp });
};

export const resetPasswordWithOtpAsync = async (email, otp, newPassword) => {
  return await postApi("/auth/forgot-password/resetAsync", { email, otp, newPassword });
};

export const getProfileAsync = async () => {
  return await getApi("/users/getProfileAsync");
};

export const updateProfileAsync = async (data) => {
  return await putApi("/users/updateProfileAsync", data);
};
