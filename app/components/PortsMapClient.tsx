"use client";

import dynamic from "next/dynamic";
import { PortTides } from "../lib/tides";

const PortsMap = dynamic(() => import("./PortsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">
      Chargement de la carte…
    </div>
  ),
});

export default function PortsMapClient({ tides }: { tides: PortTides[] }) {
  return <PortsMap tides={tides} />;
}
