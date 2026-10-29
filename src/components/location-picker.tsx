"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui";
import type { Point } from "@/lib/domain/nearby";

// Same free OpenStreetMap tiles as the Discover map.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Where the resource physically is, so Discover can measure walking distance to its building.
 * Tap the map (or drag the pin). The value travels with the form as hidden `lat` and `lng`.
 */
export function LocationPicker({ initial, campus }: { initial?: Point | null; campus?: Point | null }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const [point, setPoint] = useState<Point | null>(initial ?? null);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Placing the pin is the one operation every input path shares: tap, drag, "use my location".
  const place = useRef<(p: Point, pan?: boolean) => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      const start = initial ?? campus ?? { lat: 22.5, lng: 79 }; // centre of India if we know nothing
      const m = L.map(el.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], initial || campus ? 17 : 5);
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
      const icon = L.divIcon({ className: "", html: '<span class="map-pin is-open is-selected" aria-hidden="true"></span>', iconSize: [36, 36], iconAnchor: [18, 18] });

      place.current = (p, pan = false) => {
        const at = { lat: round(p.lat), lng: round(p.lng) };
        if (!pin.current) {
          pin.current = L.marker([at.lat, at.lng], { icon, draggable: true, keyboard: false, title: "Resource location" })
            .on("dragend", () => {
              const ll = pin.current!.getLatLng();
              setPoint({ lat: round(ll.lat), lng: round(ll.lng) });
            })
            .addTo(m);
        } else pin.current.setLatLng([at.lat, at.lng]);
        if (pan) m.setView([at.lat, at.lng], Math.max(m.getZoom(), 17));
        setPoint(at);
      };
      if (initial) place.current(initial);
      m.on("click", (e) => place.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      pin.current = null;
    };
    // The map is created once; later pin moves go through place.current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clear() {
    pin.current?.remove();
    pin.current = null;
    setPoint(null);
  }

  function hereNow() {
    if (!("geolocation" in navigator)) return setNote("This browser can’t share a location.");
    setLocating(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        place.current({ lat: coords.latitude, lng: coords.longitude }, true);
        setNote(coords.accuracy > 60 ? `Placed within about ${Math.round(coords.accuracy)} m. Drag the pin if it’s off.` : null);
      },
      () => {
        setLocating(false);
        setNote("Couldn’t get your location. Tap the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-2.5">
      <input type="hidden" name="lat" value={point?.lat ?? ""} />
      <input type="hidden" name="lng" value={point?.lng ?? ""} />
      <div
        ref={el}
        role="region"
        aria-label="Map: tap where this resource is. Optional; without a pin it shows at your campus."
        className="nearby-map relative z-0 h-64 overflow-hidden rounded-[22px] border border-rule bg-paper-2 sm:h-72"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={hereNow} disabled={locating}>
          <LocateFixed className="size-4" aria-hidden /> {locating ? "Finding you…" : "I’m standing at it"}
        </Button>
        {point && (
          <Button type="button" variant="ghost" onClick={clear}>
            Remove pin
          </Button>
        )}
        <p className="flex items-center gap-1.5 text-sm text-subtle" aria-live="polite">
          <MapPin className="size-4 shrink-0" aria-hidden />
          {point ? `Pinned at ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "No pin yet. Borrowers will see it at your campus."}
        </p>
      </div>
      {note && <p className="text-sm text-warn">{note}</p>}
    </div>
  );
}
