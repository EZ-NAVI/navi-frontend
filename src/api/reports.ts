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
 * 특정 제보에 달린 댓글 목록 조회
 * 백엔드 엔드포인트: GET /reports/{report_id}/comments/
 * 반환값은 보통 배열이므로 그대로 반환합니다. 실패 시 에러를 throw 합니다.
 */
export const fetchReportComments = async (reportId: string, token?: string) => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const res = await client.get(`/reports/${encodeURIComponent(reportId)}/comments/`, config as any);
    // defensive: if res.data.results exists, return it, else return res.data
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.results)) return res.data.results;
    return res.data;
  } catch (error: any) {
    console.error(`❌ /reports/${reportId}/comments/ 조회 실패:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * 특정 제보에 댓글 추가
 * POST /reports/{report_id}/comments/
 * 요청 바디: { content: string }
 * 반환: 생성된 댓글 객체
 */
export const postReportComment = async (reportId: string, content: string, token?: string) => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const body = { content };
    const res = await client.post(`/reports/${encodeURIComponent(reportId)}/comments/`, body, config as any);
    return res.data;
  } catch (error: any) {
    console.error(`❌ /reports/${reportId}/comments/ POST 실패:`, error.response?.data || error.message);
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
    // Debug: log the outgoing request details so callers can see what is being sent.
    try {
      console.log('API: GET /reports/filter', { baseURL: (client as any).defaults?.baseURL, params: config.params, headers: config.headers ? Object.keys(config.headers) : null });
    } catch (e) { /* ignore logging failures */ }
    const res = await client.get('/reports/filter', config as any);
    // Debug: log a compact preview of the response so callers can see what came back
    try {
      const preview = (() => {
        if (!res || typeof res !== 'object') return String(res);
        const d = res.data;
        if (Array.isArray(d)) return { status: res.status, items: d.length, sample: d.slice(0, 5) };
        if (d && Array.isArray(d.results)) return { status: res.status, items: d.results.length, sample: d.results.slice(0, 5) };
        return { status: res.status, dataType: typeof d, sample: d };
      })();
      try { console.log('API: GET /reports/filter response preview:', preview); } catch (e) { /* ignore logging errors */ }

      // Additionally log the columns / keys present on each report item (first N)
      try {
        const d = res.data;
        const list = Array.isArray(d) ? d : (d && Array.isArray(d.results) ? d.results : (d && Array.isArray(d.reports) ? d.reports : (d && Array.isArray(d.data) ? d.data : [])));
        const sample = Array.isArray(list) ? list.slice(0, 10) : [];
        const columns = sample.map((it: any) => Object.keys(it || {}).sort());
        try { console.log('API: GET /reports/filter item columns (first', sample.length, 'items):', columns); } catch (e) {}
      } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }

    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.results)) return res.data.results;
    if (res.data && Array.isArray(res.data.reports)) return res.data.reports;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    // fallback: return raw data
    return res.data;
  } catch (error: any) {
    console.error(`❌ /reports/filter?cluster_id=${clusterId} 조회 실패:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * 제보 평가 전송
 * Endpoint: POST /reports/{report_id}/evaluate
 * Body: { evaluation: 'good' | 'normal' | 'bad' }
 * UI 라벨 매핑 (중요):
 *   좋음 -> bad
 *   보통 -> normal
 *   아쉬움 -> good
 */
export const postReportEvaluation = async (reportId: string, evalKey: 'good' | 'normal' | 'bad', token?: string) => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const body = { evaluation: evalKey };
    try {
      console.log('API: POST /reports/' + reportId + '/evaluate', body);
    } catch (e) {}
    const res = await client.post(`/reports/${encodeURIComponent(reportId)}/evaluate`, body, config as any);
    try {
      console.log('API: evaluation success', { status: res.status, eval: evalKey });
    } catch (e) {}
    return res.data;
  } catch (error: any) {
    console.error(`❌ /reports/${reportId}/evaluate 실패:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * 제보 상태: "이제 없어요" 표시 전송
 * Endpoint: POST /reports/{report_id}/not-there/
 * Body: (백엔드 스펙에 따라 비어있거나 {})
 * 성공 시 반환 데이터를 그대로 리턴. 실패 시 throw.
 */
export const postReportNotThere = async (reportId: string, token?: string) => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    try { console.log('API: POST /reports/' + reportId + '/not-there/'); } catch (e) {}
    const res = await client.post(`/reports/${encodeURIComponent(reportId)}/not-there/`, {}, config as any);
    try { console.log('API: not-there success', { status: res.status }); } catch (e) {}
    return res.data;
  } catch (error: any) {
    console.error(`❌ /reports/${reportId}/not-there/ 실패:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * 제보 검토 (승인/반려)
 * Endpoint: POST /reports/{report_id}/review
 * Body: { action: "승인" | "반려" }
 */
export const postReportReview = async (reportId: string, action: '승인' | '반려', token?: string) => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    console.log(`API: POST /reports/${reportId}/review with action: ${action}`);
    const res = await client.post(`/reports/${encodeURIComponent(reportId)}/review`, { action }, config as any);
    console.log('API: review success', { status: res.status, data: res.data });
    return res.data;
  } catch (error: any) {
    console.error(`❌ /reports/${reportId}/review 실패:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * 제보 수정
 * Endpoint: PATCH /reports/{report_id}
 * Body: { category?: string, description?: string, image_url?: string, location_lat?: number, location_lng?: number }
 */
export const updateReport = async (reportId: string, payload: Partial<ReportPayload>, token?: string) => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    console.log(`API: PATCH /reports/${reportId}`, payload);
    const res = await client.patch(`/reports/${encodeURIComponent(reportId)}`, payload, config as any);
    console.log('API: update success', { status: res.status, data: res.data });
    return res.data;
  } catch (error: any) {
    console.error(`❌ /reports/${reportId} 수정 실패:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * 제보 삭제
 * Endpoint: DELETE /reports/{report_id}
 */
export const deleteReport = async (reportId: string, token?: string) => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    console.log(`API: DELETE /reports/${reportId}`);
    const res = await client.delete(`/reports/${encodeURIComponent(reportId)}`, config as any);
    console.log('API: delete success', { status: res.status, data: res.data });
    return res.data;
  } catch (error: any) {
    console.error(`❌ /reports/${reportId} 삭제 실패:`, error.response?.data || error.message);
    throw error;
  }
};
