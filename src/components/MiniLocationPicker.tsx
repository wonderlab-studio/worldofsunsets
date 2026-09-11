"use client";

import { useRef, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import styles from "./MiniLocationPicker.module.css";

function CenterTracker({
  onChange,
}: {
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter();
      onChange(c.lat, c.lng);
    },
  });
  return null;
}

export default function MiniLocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError("Geolocation is not supported");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 13);
        setLocating(false);
      },
      () => {
        setLocateError("Could not get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.mapBox}>
        <MapContainer
          ref={mapRef}
          center={[lat, lng]}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CenterTracker onChange={onChange} />
        </MapContainer>
        <div className="pin-drop-marker">📍</div>
      </div>
      <div className={styles.controls}>
        <button type="button" onClick={useMyLocation} disabled={locating}>
          {locating ? "Locating…" : "📍 Use my location"}
        </button>
        <span className={styles.coords}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
      </div>
      {locateError && <div className={styles.error}>{locateError}</div>}
    </div>
  );
}
