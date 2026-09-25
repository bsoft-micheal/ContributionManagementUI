import { getApi, postApi, deleteApi } from "./apiActions";

export const getGalleryPhotosAsync = async (params) => {
  return await getApi("/gallery/getAllGalleryAsync", params);
};

export const createGalleryPhotoAsync = async (data) => {
  return await postApi("/gallery/saveGalleryAsync", data);
};

export const deleteGalleryPhotoAsync = async (id) => {
  return await deleteApi(`/gallery/deleteGalleryAsyncById/${id}`);
};
