import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetUsersAsync = async () => {
  return await getApi("/users/getAllUserAsync");
};

export const CreateUserAsync = async (data) => {
  return await postApi("/users/saveUserAsync", data);
};

export const UpdateUserAsync = async (id, data) => {
  return await putApi(`/users/updateUserAsyncById/${id}`, data);
};

export const DeleteUserAsync = async (id) => {
  return await deleteApi(`/users/deleteUserAsyncById/${id}`);
};

export const CreateUsersBulkAsync = async (data) => {
  return await postApi("/users/saveBulkUserAsync", data);
};

export const ResetUserPasswordAsync = async (id, data) => {
  return await putApi(`/users/updateUserAsyncById/${id}`, data);
};

export const RequestForgotPasswordOtpAsync = async (email) => {
  return await postApi("/auth/forgot-password/requestAsync", { email });
};

export const VerifyForgotPasswordOtpAsync = async (email, otp) => {
  return await postApi("/auth/forgot-password/verifyAsync", { email, otp });
};

export const ResetPasswordWithOtpAsync = async (email, otp, newPassword) => {
  return await postApi("/auth/forgot-password/resetAsync", { email, otp, newPassword });
};

export const GetProfileAsync = async () => {
  return await getApi("/users/getProfileAsync");
};

export const UpdateProfileAsync = async (data) => {
  return await putApi("/users/updateProfileAsync", data);
};
