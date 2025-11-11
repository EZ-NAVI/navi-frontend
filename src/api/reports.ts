import client from './client';

// Backend expects payload like { location_lat, location_lng, image_url, category, description }
export type ReportPayload = {
  category: string;
  // legacy field used elsewhere
  content?: string;
  // canonical fields for backend
  description?: string;
  image_url?: string | null;
  photoUri?: string | null;
  createdAt?: string;
  location_lat?: number | null;
  location_lng?: number | null;
};

export type ReportResponse = {
  id?: string;
  [k: string]: any;
};

/**
 * 제보 전송 (간단한 JSON 포맷으로 전송합니다).
 * 백엔드가 multipart/form-data를 요구하면 이 함수를 수정해야 합니다.
 */
export const sendReport = async (payload: ReportPayload) => {
  try {
    const res = await client.post('/reports', payload);
    return res.data as ReportResponse;
  } catch (error: any) {
    // Log full response where available for debugging
    console.error('❌ /reports 전송 실패 status:', error.response?.status);
    console.error('❌ /reports 전송 실패 body:', error.response?.data || error.message);
    // rethrow so UI can display or handle it
    throw error;
  }
};

export default sendReport;

/**
 * 전체 제보 목록 조회
 * @param token 개발/테스트용 임시 토큰을 직접 전달할 경우 사용합니다. (옵션)
 */
export const fetchReports = async (token?: string) => {
  try {
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined;
    // Use the cluster-aggregated endpoint which returns the latest report for each cluster.
    const res = await client.get('/reports/latest-by-cluster', config as any);
    // 백엔드 응답 포맷은 배열일 것으로 기대합니다. 방어적으로 처리합니다.
    if (Array.isArray(res.data)) return res.data;
    // 만약 { results: [...] } 형태라면 그 필드를 반환
    if (res.data && Array.isArray(res.data.results)) return res.data.results;
    return res.data;
  } catch (error: any) {
    console.error('❌ /reports 조회 실패:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * presigned url 요청
 * 백엔드 Swagger에 따라 query로 file_name, file_type 전달
 * 반환값은 서버 구현에 따라 달라질 수 있으므로 호출부에서 방어적으로 처리하세요.
 */
/**
 * presigned url 요청
 * - file_name, file_type은 백엔드 스펙에 맞춰 전달
 * - optionalToken이 주어지면 해당 토큰을 명시적으로 Authorization 헤더로 붙입니다.
 *   (대부분의 경우 client 인스턴스의 인터셉터가 AsyncStorage에서 토큰을 읽어 자동으로 붙이지만,
 *    개발용 임시 토큰을 직접 전달하거나 인터셉터가 토큰을 아직 읽지 못하는 상황을 대비)
 */
export const getPresignedUrl = async (
  file_name: string,
  file_type: string,
  optionalToken?: string | null,
) => {
  try {
    const config: any = { params: { file_name, file_type } };
    if (optionalToken) {
      config.headers = { Authorization: `Bearer ${optionalToken}` };
    }

    const res = await client.get('/reports/presigned-url', config);
    return res.data;
  } catch (error: any) {
    console.error('❌ presigned-url 요청 실패:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * 단일 제보 조회
 * 반환 스키마는 /reports/latest-by-cluster 응답과 달리 상세 필드를 포함합니다.
 */
export const fetchReportById = async (reportId: string, token?: string) => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const res = await client.get(`/reports/${encodeURIComponent(reportId)}`, config as any);
    return res.data;
  } catch (error: any) {
    console.error(`❌ /reports/${reportId} 조회 실패:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * 특정 cluster에 속한 제보 목록 조회
 * @param clusterId 백엔드가 기대하는 cluster 식별자
 * @param token 선택적 개발 토큰
 */
export const fetchReportsByCluster = async (clusterId: string | number, token?: string) => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` }, params: { cluster_id: clusterId } } : { params: { cluster_id: clusterId } };
    const res = await client.get('/reports/filter', config as any);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.results)) return res.data.results;
    // fallback: if API returns object with list field
    return res.data;
  } catch (error: any) {
    console.error(`❌ /reports/filter?cluster_id=${clusterId} 조회 실패:`, error.response?.data || error.message);
    throw error;
  }
};
