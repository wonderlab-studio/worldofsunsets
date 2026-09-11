"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
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

// Leaflet measures its container's size once, at construction time. Inside a
// modal that just mounted, the browser hasn't always finished layout by then
// (font/scrollbar reflow, the dynamic-import chunk swapping in), so the map
// can grab a stale 0x0 size and render blank tiles forever until told to
// re-measure. invalidateSize() on the next frame after mount fixes that.
function SizeFixer() {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(id);
  }, [map]);
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

  // Auto-locate once on mount. Purely best-effort: on failure/denial the
  // map just keeps showing the default (Paris) center passed in by the
  // parent, with no error shown to the user.
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) {
          mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 13);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const locateMe = () => {
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
          <SizeFixer />
        </MapContainer>
        <div className="pin-drop-marker">📍</div>
      </div>
      <div className={styles.controls}>
        <button type="button" onClick={locateMe} disabled={locating}>
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
