import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AffectedProvider, EventLocation } from "@/hooks/useDigitalTwin";
import { cn } from "@/lib/utils";

/** Same tile setup as the marketplace's MatchMap — reuse, don't fork. */
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILES = import.meta.env.VITE_MAP_TILE_URL || OSM_TILES;
const IS_CARTO = TILES.includes("cartocdn");
const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ATTRIBUTION = IS_CARTO ? `${OSM_CREDIT} &copy; <a href="https://carto.com/attributions">CARTO</a>` : OSM_CREDIT;

/** Theme hex values (index.css --conflict / --marigold / --peacock) — inlined
 * because these colors are computed per-risk at render time inside a Leaflet
 * divIcon's raw HTML string, where Tailwind classes can't be generated. */
const RISK_COLOR: Record<"HIGH" | "MEDIUM" | "LOW", string> = {
  HIGH: "#C8412E", // conflict
  MEDIUM: "#F2A93B", // marigold
  LOW: "#1F6F6B", // peacock / available
};

function riskPinIcon(label: string, risk: "HIGH" | "MEDIUM" | "LOW") {
  return L.divIcon({
    className: "",
    html: `<span class="spare-pin"><span style="background:${RISK_COLOR[risk]}"><b>${label}</b></span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    tooltipAnchor: [0, -38],
  });
}

const EVENT_ICON = L.divIcon({
  className: "",
  html: '<span class="spare-origin"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitBounds({ points }: { points: L.LatLngExpression[] }) {
  const map = useMap();
  const key = points.map((p) => (Array.isArray(p) ? p.join(",") : `${p.lat},${p.lng}`)).join("|");
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 13);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

interface RiskMapProps {
  eventLocation: EventLocation;
  providers: AffectedProvider[];
}

/** Geospatial view of a simulation result — reuses the Discover page's map
 * setup so the app has one map framework, not two. Pin color is SIMULATED
 * risk, not a live condition; the event marker is the only fixed/real point. */
export default function RiskMap({ eventLocation, providers }: RiskMapProps) {
  const placed = providers.filter((p) => p.latitude !== undefined && p.longitude !== undefined);

  const points = useMemo<L.LatLngExpression[]>(
    () => [
      [eventLocation.latitude, eventLocation.longitude],
      ...placed.map((p) => [p.latitude as number, p.longitude as number] as [number, number]),
    ],
    [eventLocation, placed]
  );

  return (
    <div className="space-y-3">
      <div
        className={cn("spare-map isolate h-[360px] w-full overflow-hidden rounded-lg border border-border shadow-card", !IS_CARTO && "spare-map--osm")}
        data-lenis-prevent
      >
        <MapContainer center={[eventLocation.latitude, eventLocation.longitude]} zoom={12} scrollWheelZoom className="h-full w-full" attributionControl>
          <TileLayer url={TILES} attribution={ATTRIBUTION} subdomains={IS_CARTO ? "abcd" : "abc"} maxZoom={19} />
          <Marker position={[eventLocation.latitude, eventLocation.longitude]} icon={EVENT_ICON} keyboard={false}>
            <Tooltip direction="top" offset={[0, -10]}>
              {eventLocation.name} — event location
            </Tooltip>
          </Marker>
          {placed.map((p, i) => (
            <Marker
              key={p.providerId}
              position={[p.latitude as number, p.longitude as number]}
              icon={riskPinIcon(String(i + 1), p.logisticsRisk)}
            >
              <Tooltip direction="top" opacity={1}>
                <span className="font-sans text-xs">
                  <strong>{p.providerName}</strong>
                  <br />
                  Risk: {p.logisticsRisk} · {p.projectedFulfillment}/{p.baselineFulfillment} units
                </span>
              </Tooltip>
            </Marker>
          ))}
          <FitBounds points={points} />
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="font-medium text-ink">Simulated risk:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: RISK_COLOR.HIGH }} /> High
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: RISK_COLOR.MEDIUM }} /> Medium
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: RISK_COLOR.LOW }} /> Low
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-peacock" /> Event location
        </span>
      </div>
    </div>
  );
}
