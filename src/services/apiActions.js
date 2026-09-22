import apiClient from "./apiClient";

const unwrapResponse = (resData) => {
  if (resData && typeof resData === "object" && "success" in resData && "statusCode" in resData) {
    return resData.data !== undefined && resData.data !== null ? resData.data : resData;
  }
  return resData;
};

export const getApi = async (url, params) => {
  try {
    const response = await apiClient.get(url, { params });
    return unwrapResponse(response.data);
  } catch (error) {
    console.error(`Error in GET ${url}:`, error.response?.data || error.message);
    throw error;
  }
};

export const postApi = async (url, data) => {
  try {
    const response = await apiClient.post(url, data);
    return unwrapResponse(response.data);
  } catch (error) {
    console.error(`Error in POST ${url}:`, error.response?.data || error.message);
    throw error;
  }
};

export const putApi = async (url, data) => {
  try {
    const response = await apiClient.put(url, data);
    return unwrapResponse(response.data);
  } catch (error) {
    console.error(`Error in PUT ${url}:`, error.response?.data || error.message);
    throw error;
  }
};

export const deleteApi = async (url) => {
  try {
    const response = await apiClient.delete(url);
    return unwrapResponse(response.data);
  } catch (error) {
    console.error(`Error in DELETE ${url}:`, error.response?.data || error.message);
    throw error;
  }
};
