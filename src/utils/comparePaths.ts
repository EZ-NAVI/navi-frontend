// src/utils/comparePaths.ts
import { haversine } from "./haversine";

export function comparePaths(actual: any[], recommended: any[]) {
  if (actual.length === 0) return 0;

  let matched = 0;

  actual.forEach((pos) => {
    const distances = recommended.map(
      (p) => haversine(pos.lat, pos.lon, p.lat, p.lon)
    );

    const min = Math.min(...distances);

    if (min < 20) matched += 1; // 20m 이내 → 경로를 따라감
  });

  const ratio = matched / actual.length;

  return ratio >= 0.8 ? 1 : 0; // 80% 이상 일치하면 성공
}
