import client from "./client";

/**
 * 미리보기 경로 요청 (출발지 → 도착지)
 * @param coords origin_lat, origin_lng, dest_lat, dest_lng
 */
export const fetchPreviewRoute = async (coords: {
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
}) => {
  try {
    const response = await client.post("/routes/preview", coords);
    console.log("📦 /routes/preview 응답:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ /routes/preview 요청 실패:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * 안전 경로 저장 요청
 */
export const saveRoute = async (data: {
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  duration: number;
  path_data: any;
}) => {
  try {
    const response = await client.post("/routes", data);
    console.log("✅ /routes 저장 성공:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ /routes 저장 실패:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * 평가 점수 제출
 */
export const evaluateRoute = async (route_id: string, evaluation: number) => {
  try {
    const response = await client.post(`/routes/${route_id}/evaluate`, { evaluation });
    console.log("🧾 /evaluate 응답:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ /evaluate 실패:", error.response?.data || error.message);
    throw error;
  }
};
