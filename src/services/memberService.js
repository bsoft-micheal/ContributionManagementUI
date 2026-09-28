import { getApi, postApi, putApi, deleteApi } from "./apiActions";

/**
 * Fetches all registered member records from the backend.
 *
 * @returns {Promise<Array>} List of member objects.
 */
export const getMembersAsync = async () => {
  return await getApi("/members/getAllMemberAsync");
};

/**
 * Creates a new member record.
 *
 * @param {object} data - Member creation payload.
 * @returns {Promise<object>} Created member object.
 */
export const createMemberAsync = async (data) => {
  return await postApi("/members/saveMemberAsync", data);
};

/**
 * Updates an existing member record by ID.
 *
 * @param {string} id - Unique member identifier.
 * @param {object} data - Member update payload.
 * @returns {Promise<object>} Updated member object.
 */
export const updateMemberAsync = async (id, data) => {
  return await putApi(`/members/updateMemberAsyncById/${id}`, data);
};

/**
 * Deletes a member record by ID.
 *
 * @param {string} id - Unique member identifier.
 * @returns {Promise<object>} Deletion confirmation response.
 */
export const deleteMemberAsync = async (id) => {
  return await deleteApi(`/members/deleteMemberAsyncById/${id}`);
};

/**
 * Bulk creates multiple member records.
 *
 * @param {Array<object>} data - List of member creation payloads.
 * @returns {Promise<Array>} List of created member objects.
 */
export const createMembersBulkAsync = async (data) => {
  return await postApi("/members/saveBulkMemberAsync", data);
};