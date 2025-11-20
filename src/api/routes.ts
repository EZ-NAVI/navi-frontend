import client from "./client";

/** preview (경로만 받아옴) */
export const fetchPreviewRoute = async (coords: {
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
}) => {
  const response = await client.post("/routes/preview", coords);
  return response.data; // { path }
};

/** 실제 경로 저장 */
export const saveRoute = async (data: {
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  duration: number;
  path_data: any;
}) => {
  const response = await client.post("/routes", data);
  return response.data; // { routeId, path }
};
