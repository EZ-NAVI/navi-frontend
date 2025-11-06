// src/api/auth.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./client";

export type RegisterPayload = {
  user_type: "child" | "parent" | string;
  name: string;
  email: string;
  phone: string;
  password: string;
  parent_id?: string | null;
  birth_year?: number | null;
};

export async function registerUser(payload: RegisterPayload) {
  const { data } = await api.post("/users/register", payload);
  return data; // { message: "..." }
}

export async function login(email: string, password: string) {
  const { data } = await api.post("/users/login", { email, password });
  // data: { access_token: string, token_type: "bearer" }
  if (data?.access_token) {
    await AsyncStorage.setItem("access_token", data.access_token);
  }
  return data;
}

export async function logout() {
  await AsyncStorage.removeItem("access_token");
}
