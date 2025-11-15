// src/api/client.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const client = axios.create({
  baseURL: "http://3.37.169.176:8000", // ✅ 백엔드 베이스 URL
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ 요청 시 토큰 자동 추가
client.interceptors.request.use(async (config) => {
  // Try to read stored access token. If missing and running in dev, fall back to DEV_TOKEN.
  let token = null;
  try {
    token = await AsyncStorage.getItem("access_token");
  } catch (e) {
    // ignore
  }

  if (!token && typeof __DEV__ !== 'undefined' && __DEV__) {
    // 개발용 임시 토큰 바꿔!!!!!
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDFLN1Y2UzFEV0tLTjFXOTJZMVg3WU05NEQiLCJ1c2VyX3R5cGUiOiJwYXJlbnQiLCJyb2xlIjoiVVNFUiIsImV4cCI6MTc2MzA1NjMzMn0.ojDYW6wd5sOhoAEMH7eOT_OaVZn2XJ4UIcXaTPTpXbE";
    try { console.log('Using DEV_TOKEN for Authorization header'); } catch(e){}
  }

  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  return config;
});

export default client;
