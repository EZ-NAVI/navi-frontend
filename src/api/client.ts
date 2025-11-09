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
  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;