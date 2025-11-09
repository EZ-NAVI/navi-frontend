// src/api/api.ts
import Config from 'react-native-config';

const BASE_URL = (Config.API_BASE_URL || '').replace(/\/$/, '') || 'http://3.37.169.176:8000';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      data?.detail?.[0]?.msg ||
      data?.detail ||
      data?.message ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  // 로그인
  async login(email: string, password: string) {
    const data = await request("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // { access_token, token_type }
    if (data?.access_token) {
      await AsyncStorage.setItem("access_token", data.access_token);
      await AsyncStorage.setItem("token_type", data.token_type || "bearer");
    }
    return data;
  },

  // 내 정보
  async me() {
    const token = await AsyncStorage.getItem("access_token");
    const type = (await AsyncStorage.getItem("token_type")) || "bearer";
    if (!token) throw new Error("로그인 토큰이 없습니다.");
    return request("/users/me", {
      headers: { Authorization: `${type} ${token}` },
    });
  },

  // 회원가입
  async register(payload: any) {
    return request("/users/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async clearToken() {
    await AsyncStorage.multiRemove(["access_token", "token_type"]);
  },
};
