import type { Area, GeoPoint } from "./types";

export const AREAS: Area[] = ["Andheri", "Bandra", "Powai", "Lower Parel", "Juhu", "Vashi"];

export const AREA_CENTER: Record<Area, GeoPoint> = {
  Andheri: { lat: 19.1136, lng: 72.8697 },
  Bandra: { lat: 19.0596, lng: 72.8295 },
  Powai: { lat: 19.1176, lng: 72.906 },
  "Lower Parel": { lat: 18.9986, lng: 72.8302 },
  Juhu: { lat: 19.1075, lng: 72.8263 },
  Vashi: { lat: 19.0771, lng: 72.9986 },
};

/** Fallback origin until the signed-in business's location is available. */
export const DEFAULT_ORIGIN: GeoPoint = AREA_CENTER.Bandra;

export const MUMBAI_CENTER: GeoPoint = { lat: 19.075, lng: 72.88 };
