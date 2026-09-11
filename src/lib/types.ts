export type TimeWindow = "hour" | "day" | "week" | "anytime";

export interface SunsetMarker {
  id: string;
  thumbUrl: string;
  lat: number;
  lng: number;
  color: [r: number, g: number, b: number];
}

export interface SunsetDetail {
  id: string;
  imageUrl: string;
  thumbUrl: string;
  takenAt: string;
  lat: number;
  lng: number;
  placeName: string | null;
}

export type PendingSunset = SunsetDetail;
