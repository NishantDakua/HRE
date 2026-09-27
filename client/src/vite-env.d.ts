/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  /** Leaflet tile URL template for the Discover map (defaults to OpenStreetMap). */
  readonly VITE_MAP_TILE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
