"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { Layer } from "leaflet";
import { ColorFilterLayer, PhotoColor } from "@/lib/colorFilterLayer";

export default function ColorFilterOverlay({ photos }: { photos: PhotoColor[] }) {
  const map = useMap();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);

  useEffect(() => {
    const layer = new (ColorFilterLayer as unknown as new (photos: PhotoColor[]) => Layer)(
      photos
    );
    layer.addTo(map);
    layerRef.current = layer;
    return () => {
      map.removeLayer(layer);
      layerRef.current = null;
    };
    // Layer is created once per map instance; photo updates go through
    // setPhotos() below instead of recreating the layer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    layerRef.current?.setPhotos(photos);
  }, [photos]);

  return null;
}
