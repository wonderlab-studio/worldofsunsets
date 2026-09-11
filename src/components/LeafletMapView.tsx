"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { SunsetMarker } from "@/lib/types";

function thumbIcon(url: string) {
  return L.divIcon({
    html: `<div class="thumb-marker"><img src="${url}" alt="" loading="lazy" /></div>`,
    className: "thumb-marker-wrapper",
    iconSize: [36, 36],
  });
}

export default function LeafletMapView({
  sunsets,
  onSelect,
}: {
  sunsets: SunsetMarker[];
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      worldCopyJump
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading spiderfyOnMaxZoom>
        {sunsets.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={thumbIcon(s.thumbUrl)}
            eventHandlers={{ click: () => onSelect(s.id) }}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
