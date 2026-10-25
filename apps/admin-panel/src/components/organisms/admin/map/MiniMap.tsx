"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { fixLeafletIcon } from "./leaflet-utils";
import "leaflet/dist/leaflet.css";

interface MiniMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}

export function MiniMap({
  lat,
  lng,
  zoom = 16,
  className = "relative z-0 h-24 w-28 shrink-0 isolate overflow-hidden rounded-lg border border-border/60",
}: MiniMapProps) {
  useEffect(() => {
    fixLeafletIcon();
  }, []);

  return (
    <div className={className}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        className="pointer-events-none !z-0 h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  );
}
