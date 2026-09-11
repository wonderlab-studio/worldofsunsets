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

// OSM's tiles only exist up to Web Mercator's latitude limit (~85.05°);
// past that there's nothing to render. Capping drag/pan there (while still
// letting longitude wrap freely via worldCopyJump) stops the map from being
// pannable into empty/duplicated-tile space above the north pole or below
// the south pole.
const MAX_LATITUDE = 85.0511;
const WORLD_BOUNDS: L.LatLngBoundsExpression = [
  [-MAX_LATITUDE, -Infinity],
  [MAX_LATITUDE, Infinity],
];

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
      maxBounds={WORLD_BOUNDS}
      maxBoundsViscosity={1.0}
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
