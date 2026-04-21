"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { PortTides } from "../lib/tides";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PortsMap({ tides }: { tides: PortTides[] }) {
  return (
    <MapContainer
      center={[48.2, -3.2]}
      zoom={8}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      className="rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {tides.map((t) => {
        const nextHigh = t.next?.type === "high";
        const color = nextHigh ? "#0284c7" : "#f59e0b";
        return (
          <CircleMarker
            key={t.port.slug}
            center={[t.port.latitude, t.port.longitude]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: color,
              fillOpacity: 0.9,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <strong>{t.port.name}</strong>
              {t.next && (
                <>
                  <br />
                  {t.next.type === "high" ? "PM" : "BM"} à {formatTime(t.next.time)} ·{" "}
                  {t.next.height.toFixed(2)} m
                </>
              )}
            </Tooltip>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{t.port.name}</div>
                <div className="text-xs text-slate-500">{t.port.department}</div>
                {t.next && (
                  <div className="mt-1">
                    Prochaine {t.next.type === "high" ? "pleine mer" : "basse mer"} :{" "}
                    <strong>{formatTime(t.next.time)}</strong> ({t.next.height.toFixed(2)} m)
                  </div>
                )}
                {t.daily[0]?.coefficient != null && (
                  <div className="mt-1">
                    Coef. aujourd&apos;hui :{" "}
                    <strong>{t.daily[0].coefficient}</strong>
                  </div>
                )}
                <a
                  href={`/ports/${t.port.slug}`}
                  className="mt-2 inline-block text-sky-700 font-medium"
                >
                  Voir les prévisions →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
