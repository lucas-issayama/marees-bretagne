export type Port = {
  slug: string;
  name: string;
  department: string;
  latitude: number;
  longitude: number;
};

export const PORTS: Port[] = [
  { slug: "brest", name: "Brest", department: "Finistère", latitude: 48.39, longitude: -4.49 },
  { slug: "saint-malo", name: "Saint-Malo", department: "Ille-et-Vilaine", latitude: 48.65, longitude: -2.03 },
  { slug: "roscoff", name: "Roscoff", department: "Finistère", latitude: 48.73, longitude: -3.98 },
  { slug: "concarneau", name: "Concarneau", department: "Finistère", latitude: 47.87, longitude: -3.92 },
  { slug: "lorient", name: "Lorient", department: "Morbihan", latitude: 47.75, longitude: -3.37 },
  { slug: "vannes", name: "Vannes", department: "Morbihan", latitude: 47.58, longitude: -2.76 },
  { slug: "saint-nazaire", name: "Saint-Nazaire", department: "Loire-Atlantique", latitude: 47.27, longitude: -2.21 },
  { slug: "paimpol", name: "Paimpol", department: "Côtes-d'Armor", latitude: 48.78, longitude: -3.05 },
];
