"use client";

import Map from "react-map-gl/maplibre";
import { DeckGLOverlay } from "./DeckGLOverlay";
import type { MapboxOverlayProps } from "./DeckGLOverlay";
import "maplibre-gl/dist/maplibre-gl.css";

const BASEMAP = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const INITIAL_VIEW = { longitude: 10, latitude: 25, zoom: 1.8, pitch: 0, bearing: 0 };

interface MapViewProps {
  deckProps: MapboxOverlayProps;
}

export function MapView({ deckProps }: MapViewProps) {
  return (
    <Map initialViewState={INITIAL_VIEW} style={{ width: "100%", height: "100%" }} mapStyle={BASEMAP} attributionControl={false}>
      <DeckGLOverlay {...deckProps} />
    </Map>
  );
}
