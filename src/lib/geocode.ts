import "server-only";

// Free geocoding from OpenStreetMap's Nominatim. Its policy: an identifying User-Agent and at most
// one request a second, which institute registration never comes near. Failure is fine: the
// institute just has no map pin until an admin sets one.

type Hit = { lat: string; lon: string };

async function search(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Baanto/1.0 (campus equipment sharing)" }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as Hit[];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

/** The institute itself if OpenStreetMap knows it, otherwise the centre of its city. */
export async function geocodeInstitute(name: string, city: string, state: string) {
  return (await search(`${name}, ${city}, ${state}`)) ?? (await search(`${city}, ${state}`));
}
