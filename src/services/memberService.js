import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetMembersAsync = async () => {
  return await getApi("/members/getAllMemberAsync");
};

export const CreateMemberAsync = async (data) => {
  return await postApi("/members/saveMemberAsync", data);
};

export const UpdateMemberAsync = async (id, data) => {
  return await putApi(`/members/updateMemberAsyncById/${id}`, data);
};

export const DeleteMemberAsync = async (id) => {
  return await deleteApi(`/members/deleteMemberAsyncById/${id}`);
};

export const CreateMembersBulkAsync = async (data) => {
  return await postApi("/members/saveBulkMemberAsync", data);
};