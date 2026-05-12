/**
 * 通勤反查算法（地铁站等时圈）
 *
 * 思路（面试要点）：
 * 1. 用户输入：公司位置 + 期望通勤时间上限 T 分钟
 * 2. 对每个地铁站，估算它到公司的"复合通勤时长"：
 *    - 步行到地铁站：500m/站，按 4 km/h = 7.5 分钟/km
 *    - 地铁段时长：取直线距离 / 35 km/h（含等车/换乘 buffer）
 *    - 进出站固定 buffer：5 分钟
 * 3. 时长 ≤ T 的地铁站 = "符合通勤要求的等时圈"
 * 4. 房源若 subwayDistance ≤ 800m 且距离最近等时圈地铁站 ≤ 300m → 房源入选
 *
 * 真实产品里会用高德/百度的"等时圈 API"或公交规划接口；
 * 这里用简化模型保证 demo 离线可跑且响应即时
 */

import type { Apartment } from "@/types";

export interface SubwayStation {
  id: string;
  name: string;
  line: string;
  lng: number;
  lat: number;
}

export interface Company {
  id: string;
  name: string;
  lng: number;
  lat: number;
  address?: string;
  industry?: string;
}

/** 经纬度直线距离（米），Haversine */
export function haversine(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number }
): number {
  const R = 6371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 估算地铁站 → 公司的通勤分钟数
 * - 地铁段：直线距离 / 35 km/h
 * - 进出站 + 等车 buffer：5 分钟
 * - 公司步行段：公司到站直线 / 4.5 km/h
 */
export function estimateCommuteMinutes(
  station: SubwayStation,
  company: Company
): number {
  const subwayDistKm = haversine(station, company) / 1000;
  const subwayTime = (subwayDistKm / 35) * 60;
  const walkDistKm = Math.min(subwayDistKm, 0.6); // 公司到站步行 (假设 ≤ 600m)
  const walkTime = (walkDistKm / 4.5) * 60;
  return Math.round(subwayTime + walkTime + 5);
}

/** 找出"等时圈"内的所有地铁站 */
export function stationsWithinCommuteTime(
  stations: SubwayStation[],
  company: Company,
  maxMinutes: number
): Array<SubwayStation & { commuteMinutes: number }> {
  return stations
    .map((s) => ({ ...s, commuteMinutes: estimateCommuteMinutes(s, company) }))
    .filter((s) => s.commuteMinutes <= maxMinutes)
    .sort((a, b) => a.commuteMinutes - b.commuteMinutes);
}

/** 找出"等时圈内地铁站附近"的房源 */
export function apartmentsNearStations(
  apartments: Apartment[],
  stations: Array<SubwayStation & { commuteMinutes: number }>,
  maxStationDistanceM = 1000
): Array<Apartment & { nearestStation: SubwayStation & { commuteMinutes: number }; distanceToStation: number }> {
  if (stations.length === 0) return [];
  const result: Array<
    Apartment & {
      nearestStation: SubwayStation & { commuteMinutes: number };
      distanceToStation: number;
    }
  > = [];

  apartments.forEach((apt) => {
    let nearest = stations[0];
    let minDist = haversine(apt.coordinates, stations[0]);
    for (let i = 1; i < stations.length; i++) {
      const d = haversine(apt.coordinates, stations[i]);
      if (d < minDist) {
        minDist = d;
        nearest = stations[i];
      }
    }
    if (minDist <= maxStationDistanceM) {
      result.push({ ...apt, nearestStation: nearest, distanceToStation: minDist });
    }
  });

  // 按"通勤总时长"排序：地铁段时长 + 步行段时长
  return result.sort((a, b) => {
    const aTotal = a.nearestStation.commuteMinutes + (a.distanceToStation / 4500) * 60;
    const bTotal = b.nearestStation.commuteMinutes + (b.distanceToStation / 4500) * 60;
    return aTotal - bTotal;
  });
}
