export type Port = {
  slug: string;
  name: string;
  department: string;
  latitude: number;
  longitude: number;
  // SHOM calibration — see RAM (Références Altimétriques Maritimes).
  // unitHeight (U): unité de hauteur in meters; coef = 100 × (HM − NM) / U.
  // chartDatumOffset (NM): niveau moyen above the zéro hydrographique (chart
  // datum) in meters. Open-Meteo returns heights relative to MSL, so adding
  // NM converts to heights as published by SHOM / maree.info.
  unitHeight: number;
  chartDatumOffset: number;
};

export const PORTS: Port[] = [
  {
    slug: "brest",
    name: "Brest",
    department: "Finistère",
    latitude: 48.39,
    longitude: -4.49,
    unitHeight: 3.05,
    chartDatumOffset: 4.02,
  },
  {
    slug: "saint-malo",
    name: "Saint-Malo",
    department: "Ille-et-Vilaine",
    latitude: 48.65,
    longitude: -2.03,
    unitHeight: 5.65,
    chartDatumOffset: 6.49,
  },
  {
    slug: "roscoff",
    name: "Roscoff",
    department: "Finistère",
    latitude: 48.73,
    longitude: -3.98,
    unitHeight: 4.15,
    chartDatumOffset: 4.82,
  },
  {
    slug: "concarneau",
    name: "Concarneau",
    department: "Finistère",
    latitude: 47.87,
    longitude: -3.92,
    unitHeight: 2.35,
    chartDatumOffset: 2.88,
  },
  {
    slug: "lorient",
    name: "Lorient",
    department: "Morbihan",
    latitude: 47.75,
    longitude: -3.37,
    unitHeight: 2.10,
    chartDatumOffset: 2.80,
  },
  {
    slug: "vannes",
    name: "Vannes",
    department: "Morbihan",
    latitude: 47.58,
    longitude: -2.76,
    unitHeight: 0.80,
    chartDatumOffset: 1.85,
  },
  {
    slug: "saint-nazaire",
    name: "Saint-Nazaire",
    department: "Loire-Atlantique",
    latitude: 47.27,
    longitude: -2.21,
    unitHeight: 2.50,
    chartDatumOffset: 3.35,
  },
  {
    slug: "paimpol",
    name: "Paimpol",
    department: "Côtes-d'Armor",
    latitude: 48.78,
    longitude: -3.05,
    unitHeight: 4.90,
    chartDatumOffset: 5.75,
  },
  {
    slug: "saint-brieuc",
    name: "Saint-Brieuc",
    department: "Côtes-d'Armor",
    latitude: 48.53,
    longitude: -2.72,
    unitHeight: 5.75,
    chartDatumOffset: 6.40,
  },
];
