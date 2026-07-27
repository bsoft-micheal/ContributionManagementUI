import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetUsers = async () => {
  try {
    const result = await getApi("/users");
    return result;
  } catch (error) {
    console.error('Error fetching users:', error.response?.data || error.message);
    throw error;
  }
};

export const CreateUser = async (data) => {
  try {
    const result = await postApi("/users", data);
    return result;
  } catch (error) {
    console.error('Error creating user:', error.response?.data || error.message);
    throw error;
  }
};

export const UpdateUser = async (id, data) => {
  try {
    const result = await putApi(`/users/${id}`, data);
    return result;
  } catch (error) {
    console.error('Error updating user:', error.response?.data || error.message);
    throw error;
  }
};

export const DeleteUser = async (id) => {
  try {
    const result = await deleteApi(`/users/${id}`);
    return result;
  } catch (error) {
    console.error('Error deleting user:', error.response?.data || error.message);
    throw error;
  }
};

export const CreateUsersBulk = async (data) => {
  try {
    const result = await postApi("/users/bulk", data);
    return result;
  } catch (error) {
    console.error('Error creating users in bulk:', error.response?.data || error.message);
    throw error;
  }
};

export const ResetUserPassword = async (id, data) => {
  try {
    const result = await putApi(`/users/${id}/reset-password`, data);
    return result;
  } catch (error) {
    console.error('Error resetting user password:', error.response?.data || error.message);
    throw error;
  }
};

export const RequestForgotPasswordOtp = async (email) => {
  try {
    const result = await postApi("/auth/forgot-password/request", { email });
    return result;
  } catch (error) {
    console.error('Error requesting forgot password OTP:', error.response?.data || error.message);
    throw error;
  }
};

export const VerifyForgotPasswordOtp = async (email, otp) => {
  try {
    const result = await postApi("/auth/forgot-password/verify", { email, otp });
    return result;
  } catch (error) {
    console.error('Error verifying forgot password OTP:', error.response?.data || error.message);
    throw error;
  }
};

export const ResetPasswordWithOtp = async (email, otp, newPassword) => {
  try {
    const result = await postApi("/auth/forgot-password/reset", { email, otp, newPassword });
    return result;
  } catch (error) {
    console.error('Error resetting password with OTP:', error.response?.data || error.message);
    throw error;
  }
};
