import { getApi, postApi } from "./apiActions";

export const getUserRightsAsync = async (roleName) => {
  return await getApi(`/user-rights/getUserRightAsyncByRole/${roleName}`);
};

export const saveUserRightsAsync = async (data) => {
  return await postApi("/user-rights/saveUserRightAsync", data);
};
