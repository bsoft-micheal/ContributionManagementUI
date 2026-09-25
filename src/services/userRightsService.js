import { getApi, postApi } from "./apiActions";

export const GetUserRightsAsync = async (roleName) => {
  return await getApi(`/user-rights/getUserRightAsyncByRole/${roleName}`);
};

export const SaveUserRightsAsync = async (data) => {
  return await postApi("/user-rights/saveUserRightAsync", data);
};
