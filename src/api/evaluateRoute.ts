// src/api/evaluateRoute.ts
import client from "./client";

export const evaluateRoute = async (routeId: string, score: number) => {
  const url = `/routes/${routeId}/evaluate`;

  console.log("📤 평가 요청 URL:", url); // Config 제거!

  // client 사용 → interceptors에 의해 토큰 자동 첨부됨!
  return client.post(url, {
    evaluation: Number(score),
  });
};
