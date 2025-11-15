// src/api/evaluateRoute.ts
import axios from "axios";
import Config from "react-native-config";

export const evaluateRoute = async (routeId: string, score: number) => {
  const url = `${Config.API_URL}/routes/${routeId}/evaluate`;

  return axios.post(url, {
    evaluation: score,
  });
};
