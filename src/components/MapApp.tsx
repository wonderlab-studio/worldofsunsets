"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import TimeFilter from "./TimeFilter";
import PhotoModal from "./PhotoModal";
import { SunsetMarker, TimeWindow } from "@/lib/types";
import styles from "./MapApp.module.css";

// Both dynamically imported with ssr:false: they (transitively) import
// `leaflet`, which touches `window` at module load time and cannot run
// during server-side prerendering.
const LeafletMapView = dynamic(() => import("./LeafletMapView"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});
const AddSunsetForm = dynamic(() => import("./AddSunsetForm"), { ssr: false });

export default function MapApp() {
  const [window, setWindow] = useState<TimeWindow>("anytime");
  const [sunsets, setSunsets] = useState<SunsetMarker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadSunsets = useCallback(async (w: TimeWindow) => {
    const res = await fetch(`/api/sunsets?window=${w}`);
    if (res.ok) setSunsets(await res.json());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sunsets?window=${window}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setSunsets(data);
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  return (
    <div className={styles.page}>
      <div className={styles.filterBar}>
        <TimeFilter value={window} onChange={setWindow} />
      </div>

      <LeafletMapView sunsets={sunsets} onSelect={setSelectedId} />

      <button className={styles.addButton} onClick={() => setShowAddForm(true)}>
        + Add sunset
      </button>

      {selectedId && (
        <PhotoModal sunsetId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {showAddForm && (
        <AddSunsetForm
          onClose={() => setShowAddForm(false)}
          onSubmitted={() => {
            setShowAddForm(false);
            loadSunsets(window);
          }}
        />
      )}
    </div>
  );
}
