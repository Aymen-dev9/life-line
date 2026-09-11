"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, LeafletMouseEvent } from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import { useContent } from "./content-provider";

export type SelectedLocation = { lat: number; lng: number; address: string };

// Baghdad — a sensible default view for Iraq before the user picks a point.
const IRAQ_CENTER: [number, number] = [33.3152, 44.3661];

const PIN_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='42' viewBox='0 0 32 42'>" +
  "<path d='M16 0C7.7 0 1 6.7 1 15c0 10.5 13.2 25.2 13.8 25.8a1.6 1.6 0 0 0 2.4 0C17.8 40.2 31 25.5 31 15 31 6.7 24.3 0 16 0z' fill='#0b7a69'/>" +
  "<circle cx='16' cy='15' r='6' fill='#ffffff'/></svg>";

async function reverseGeocode(lat: number, lng: number, signal: AbortSignal): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&accept-language=ar`;
    const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) return "";
    const data = (await response.json()) as { display_name?: string };
    return data.display_name ?? "";
  } catch { return ""; }
}

export function LocationPicker({ initial, onChange }: { initial: SelectedLocation | null; onChange: (value: SelectedLocation | null) => void }) {
  const { c } = useContent();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const geocodeAbort = useRef<AbortController | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const selectedRef = useRef<SelectedLocation | null>(initial);
  const [selected, setSelected] = useState<SelectedLocation | null>(initial);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");

  // Single source of truth for the current selection; keeps state + parent + ref in sync
  // without ever calling setState inside another component's render/updater.
  function commitSelection(value: SelectedLocation) {
    selectedRef.current = value;
    setSelected(value);
    onChangeRef.current(value);
  }

  // Debounced, best-effort reverse geocode (respects Nominatim's 1 req/action policy).
  function resolveAddress(lat: number, lng: number) {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => {
      geocodeAbort.current?.abort();
      const controller = new AbortController();
      geocodeAbort.current = controller;
      void reverseGeocode(lat, lng, controller.signal).then(address => {
        const cur = selectedRef.current;
        if (!cur || cur.lat !== lat || cur.lng !== lng || !address) return;
        commitSelection({ ...cur, address });
      });
    }, 800);
  }

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !containerRef.current || mapRef.current) return;
      const start: [number, number] = selected ? [selected.lat, selected.lng] : IRAQ_CENTER;
      const map = L.map(containerRef.current, { center: start, zoom: selected ? 16 : 6, scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      const icon = L.divIcon({ className: "care-map-pin", html: PIN_SVG, iconSize: [32, 42], iconAnchor: [16, 42] });

      const place = (lat: number, lng: number) => {
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else {
          const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
          marker.on("dragend", () => { const p = marker.getLatLng(); commit(p.lat, p.lng); });
          markerRef.current = marker;
        }
      };
      const commit = (lat: number, lng: number) => {
        place(lat, lng);
        const value = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), address: "" };
        commitSelection(value);
        resolveAddress(value.lat, value.lng);
      };

      commitRef.current = commit;
      if (selected) place(selected.lat, selected.lng);
      map.on("click", (event: LeafletMouseEvent) => commit(event.latlng.lat, event.latlng.lng));
      mapRef.current = map;
      // Leaflet needs a real size; recompute once the RTL/flex layout settles.
      setTimeout(() => map.invalidateSize(), 120);
    })();
    return () => {
      disposed = true;
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      geocodeAbort.current?.abort();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!("geolocation" in navigator)) { setNotice(c("field.locationDenied")); return; }
    setLocating(true); setNotice("");
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        mapRef.current?.setView([latitude, longitude], 17);
        commitRef.current?.(latitude, longitude);
      },
      () => { setLocating(false); setNotice(c("field.locationDenied")); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <div className="care-location">
      <div className="care-location-head">
        <span className="care-location-label"><MapPin size={18} />{c("field.location")}</span>
        <button type="button" className="care-secondary care-location-btn" onClick={useMyLocation} disabled={locating}>
          <LocateFixed size={17} />{c(locating ? "field.locating" : "field.useMyLocation")}
        </button>
      </div>
      <p className="care-help">{c("field.locationHint")}</p>
      <div ref={containerRef} className="care-map" role="application" aria-label={c("field.location")} />
      {notice && <p role="status" className="care-alert error">{notice}</p>}
      {selected && (
        <p className="care-location-selected">
          <MapPin size={15} />
          <span>{selected.address || c("field.selectedLocation")}</span>
          <span dir="ltr" className="care-muted">{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</span>
        </p>
      )}
    </div>
  );
}
