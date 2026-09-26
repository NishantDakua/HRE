import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import type { Row } from "./rows";

/*
 * CARTO Voyager is the intended basemap, but its public endpoint now serves an
 * "API key required" placeholder. Set VITE_MAP_TILE_URL to a Voyager URL your
 * CARTO account can use, e.g.
 *   https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
 * Until then we fall back to OpenStreetMap tiles, warmed with a CSS filter.
 */
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILES = import.meta.env.VITE_MAP_TILE_URL || OSM_TILES;
const IS_CARTO = TILES.includes("cartocdn");
const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ATTRIBUTION = IS_CARTO ? `${OSM_CREDIT} &copy; <a href="https://carto.com/attributions">CARTO</a>` : OSM_CREDIT;

function pinIcon(label: string, active: boolean) {
  return L.divIcon({
    className: "",
    html: `<span class="spare-pin${active ? " is-active" : ""}"><span><b>${label}</b></span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    tooltipAnchor: [0, -38],
  });
}

const ORIGIN_ICON = L.divIcon({
  className: "",
  html: '<span class="spare-origin"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitBounds({ rows, origin }: { rows: Row[]; origin: GeoPoint }) {
  const map = useMap();
  const key = rows.map((r) => r.resource.id).join(",");
  useEffect(() => {
    const points: L.LatLngExpression[] = [[origin.lat, origin.lng], ...rows.map((r) => [r.resource.business.lat, r.resource.business.lng] as [number, number])];
    if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, origin.lat, origin.lng, map]);
  return null;
}

interface MatchMapProps {
  rows: Row[];
  origin: GeoPoint;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export default function MatchMap({ rows, origin, hoveredId, onHover, onSelect }: MatchMapProps) {
  // Several resources can share a business; offset duplicates slightly so pins don't stack.
  const placed = useMemo(() => {
    const seen = new Map<string, number>();
    return rows.map((row, i) => {
      const k = row.resource.businessId;
      const n = seen.get(k) ?? 0;
      seen.set(k, n + 1);
      const angle = n * 1.2;
      return {
        row,
        label: row.score ? String(i + 1) : "₹",
        pos: [row.resource.business.lat + Math.sin(angle) * 0.0012 * n, row.resource.business.lng + Math.cos(angle) * 0.0012 * n] as [number, number],
      };
    });
  }, [rows]);

  return (
    <div
      className={cn("spare-map isolate h-full w-full overflow-hidden rounded-lg border border-border shadow-card", !IS_CARTO && "spare-map--osm")}
      data-lenis-prevent
    >
      <MapContainer center={[origin.lat, origin.lng]} zoom={12} scrollWheelZoom className="h-full w-full" attributionControl>
        <TileLayer url={TILES} attribution={ATTRIBUTION} subdomains={IS_CARTO ? "abcd" : "abc"} maxZoom={19} />
        <Marker position={[origin.lat, origin.lng]} icon={ORIGIN_ICON} keyboard={false}>
          <Tooltip direction="top" offset={[0, -10]}>
            Your venue
          </Tooltip>
        </Marker>
        {placed.map(({ row, label, pos }) => {
          const id = row.resource.id;
          const active = hoveredId === id;
          return (
            <Marker
              key={id}
              position={pos}
              icon={pinIcon(label, active)}
              zIndexOffset={active ? 1000 : 0}
              eventHandlers={{
                mouseover: () => onHover(id),
                mouseout: () => onHover(null),
                click: () => onSelect(id),
              }}
            >
              <Tooltip direction="top" opacity={1}>
                <span className="font-sans text-xs">
                  <strong>{row.resource.business.name}</strong>
                  <br />
                  {row.resource.title} · {row.distanceKm.toFixed(1)} km
                  {row.landed !== undefined && <> · ₹{formatINR(row.landed)}</>}
                </span>
              </Tooltip>
            </Marker>
          );
        })}
        <FitBounds rows={rows} origin={origin} />
      </MapContainer>
    </div>
  );
}
