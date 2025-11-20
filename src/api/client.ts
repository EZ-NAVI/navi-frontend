import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDevToken, API_BASE_URL } from "../config/dev";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(async (config) => {
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem("access_token");
  } catch (e) {
    // ignore
  }

  // Fallback to dev token if no stored token and running in dev
  if (!token) {
    try {
      token = getDevToken();
    } catch (e) {
      // ignore
    }
  }

  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  return config;
});

export default client;