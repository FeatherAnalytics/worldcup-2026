"use client";

import { useControl } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { MapboxOverlayProps } from "@deck.gl/mapbox";

export type { MapboxOverlayProps };

export function DeckGLOverlay(props: MapboxOverlayProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlay = useControl<any>(() => new MapboxOverlay({ interleaved: false }));
  overlay.setProps(props);
  return null;
}
