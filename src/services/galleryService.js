import { getApi, postApi, deleteApi } from "./apiActions";

export const getGalleryPhotos = async (params) => {
  try {
    return await getApi("/gallery", params);
  } catch (error) {
    console.error("Error fetching gallery photos:", error.response?.data || error.message);
    throw error;
  }
};

export const createGalleryPhoto = async (data) => {
  try {
    return await postApi("/gallery", data);
  } catch (error) {
    console.error("Error creating gallery photo:", error.response?.data || error.message);
    throw error;
  }
};

export const deleteGalleryPhoto = async (id) => {
  try {
    return await deleteApi(`/gallery/${id}`);
  } catch (error) {
    console.error("Error deleting gallery photo:", error.response?.data || error.message);
    throw error;
  }
};
