"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { distanceKm, formatDistance, type Point } from "@/lib/domain/nearby";

export type NearbyItem = { id: string; name: string; canUse: boolean; note: string; opensAt: string | null; opensLabel: string | null };
export type NearbyPlace = { id: string; lat: number; lng: number; title: string; org: string; items: NearbyItem[] };

const SHOWN = 6;

// OpenStreetMap's own tiles: free, no key, attribution required (and kept). Dark mode is a CSS filter.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function NearbyMap({ home, homeLabel, places }: { home: Point; homeLabel: string; places: NearbyPlace[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const youMarker = useRef<Marker | null>(null);
  const [origin, setOrigin] = useState<{ point: Point; label: string; you: boolean }>({ point: home, label: homeLabel, you: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // Every open resource with its distance from wherever "here" is, nearest first, then soonest.
  const rows = useMemo(() => {
    const all = places.flatMap((p) => p.items.filter((i) => i.opensAt).map((i) => ({ ...i, place: p, km: distanceKm(origin.point, p) })));
    return all.sort((a, b) => a.km - b.km || a.opensAt!.localeCompare(b.opensAt!));
  }, [places, origin]);
  const shown = selected ? rows.filter((r) => r.place.id === selected) : rows.slice(0, SHOWN);
  const closed = places.flatMap((p) => p.items).filter((i) => !i.opensAt).length;

  useEffect(() => {
    let cancelled = false;
    const pins = markers.current;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      const m = L.map(el.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
      for (const p of places) {
        const open = p.items.filter((i) => i.opensAt).length;
        const icon = L.divIcon({
          className: "",
          html: `<span class="map-pin${open ? " is-open" : ""}">${open || "–"}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const marker = L.marker([p.lat, p.lng], { icon, title: `${p.title}: ${open} open`, keyboard: true })
          .on("click", () => setSelected((s) => (s === p.id ? null : p.id)))
          .addTo(m);
        pins.set(p.id, marker);
      }
      const bounds = L.latLngBounds([[home.lat, home.lng], ...places.map((p) => [p.lat, p.lng] as [number, number])]);
      m.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      pins.clear();
      youMarker.current = null;
    };
  }, [places, home]);

  useEffect(() => {
    for (const [id, marker] of markers.current) marker.getElement()?.firstElementChild?.classList.toggle("is-selected", id === selected);
  }, [selected]);

  async function useMyLocation() {
    if (!("geolocation" in navigator)) return setLocateError("This browser can’t share a location.");
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setLocating(false);
        const point = { lat: coords.latitude, lng: coords.longitude };
        setOrigin({ point, label: "you", you: true });
        const L = (await import("leaflet")).default;
        const m = map.current;
        if (!m) return;
        youMarker.current?.remove();
        youMarker.current = L.marker([point.lat, point.lng], {
          icon: L.divIcon({ className: "", html: '<span class="map-you" aria-hidden="true"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
          title: "You",
          keyboard: false,
        }).addTo(m);
        const nearest = places
          .filter((p) => p.items.some((i) => i.opensAt))
          .sort((a, b) => distanceKm(point, a) - distanceKm(point, b))[0];
        const target = L.latLngBounds([[point.lat, point.lng], ...(nearest ? [[nearest.lat, nearest.lng] as [number, number]] : [])]);
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        m.fitBounds(target, { padding: [48, 48], maxZoom: 17, animate: !still });
      },
      (err) => {
        setLocating(false);
        setLocateError(err.code === err.PERMISSION_DENIED ? "Location is blocked for this site. Distances stay measured from your campus." : "Couldn’t find your location. Try again.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <section aria-labelledby="nearby-heading" className="mb-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="nearby-heading" className="type-h3">
            Closest open slots
          </h2>
          <p className="text-[15px] text-subtle">
            {origin.you ? "Distances from where you are now." : `Distances from ${origin.label}.`} Each pin shows how many things there have a free hour this week.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={useMyLocation} disabled={locating}>
          <LocateFixed className="size-4" aria-hidden /> {locating ? "Finding you…" : origin.you ? "Update my location" : "Use my location"}
        </Button>
      </div>
      {locateError && (
        <p role="status" className="mb-3 text-[15px] text-warn">
          {locateError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div
          ref={el}
          role="region"
          aria-label="Map of places with open slots. The list beside it has the same information."
          className="nearby-map relative z-0 h-[300px] overflow-hidden rounded-lg border-2 border-ink bg-paper-2 sm:h-[400px]"
        />

        <div>
          {selected && (
            <p className="mb-2 flex items-center justify-between gap-2 text-[15px]">
              <span className="font-semibold">{places.find((p) => p.id === selected)?.title}</span>
              <button type="button" onClick={() => setSelected(null)} className="min-h-11 px-2 font-semibold underline underline-offset-4">
                Show all
              </button>
            </p>
          )}
          {shown.length === 0 ? (
            <p className="rounded-lg border border-rule bg-card p-5 text-[15px] text-ink-2">
              Nothing here has a free hour in the next week. Try a wider area, or request a slot and join the queue.
            </p>
          ) : (
            <ol className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
              {shown.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/resources/${r.id}`}
                    onMouseEnter={() => markers.current.get(r.place.id)?.getElement()?.firstElementChild?.classList.add("is-hover")}
                    onMouseLeave={() => markers.current.get(r.place.id)?.getElement()?.firstElementChild?.classList.remove("is-hover")}
                    className="grid min-h-11 grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-3 transition-colors hover:bg-paper-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{r.name}</span>
                      <span className="flex items-center gap-1 truncate text-sm text-subtle">
                        <MapPin className="size-3.5 shrink-0" aria-hidden /> {r.place.title}
                        {r.place.org !== r.place.title && `, ${r.place.org}`}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className={cn("tab block text-sm font-bold", r.opensLabel?.startsWith("Open now") ? "text-ok" : "text-ink")}>{r.opensLabel}</span>
                      <span className="tab block text-sm text-subtle">{formatDistance(r.km)}</span>
                    </span>
                    <span className={cn("col-span-2 mt-1 text-sm", r.canUse ? "text-ok" : "text-subtle")}>{r.note}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {!selected && rows.length > SHOWN && <p className="mt-2 text-sm text-subtle">{rows.length - SHOWN} more with open slots below.</p>}
          {closed > 0 && <p className="mt-1 text-sm text-subtle">{closed} fully booked or closed this week.</p>}
        </div>
      </div>
    </section>
  );
}
