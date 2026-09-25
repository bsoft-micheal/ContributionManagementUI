import apiClient from "./apiClient";

const unwrapResponse = (resData) => {
  if (resData && typeof resData === "object" && "success" in resData && "statusCode" in resData) {
    return resData.data !== undefined && resData.data !== null ? resData.data : resData;
  }
  return resData;
};

export const getApi = async (url, params) => {
  const response = await apiClient.get(url, { params });
  return unwrapResponse(response.data);
};

export const postApi = async (url, data) => {
  const response = await apiClient.post(url, data);
  return unwrapResponse(response.data);
};

export const putApi = async (url, data) => {
  const response = await apiClient.put(url, data);
  return unwrapResponse(response.data);
};

export const deleteApi = async (url) => {
  const response = await apiClient.delete(url);
  return unwrapResponse(response.data);
};
