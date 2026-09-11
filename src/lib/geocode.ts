const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

// Best-effort reverse geocode. Never throws — moderation/upload should not
// fail just because the place name lookup is unavailable.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const userAgent = process.env.NOMINATIM_USER_AGENT;
  if (!userAgent) {
    console.warn("NOMINATIM_USER_AGENT not set; skipping reverse geocode");
    return null;
  }

  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as NominatimResponse;
    const addr = data.address;
    if (!addr) return data.display_name ?? null;

    const place = addr.city || addr.town || addr.village || addr.hamlet || addr.county;
    const parts = [place, addr.state, addr.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : (data.display_name ?? null);
  } catch (err) {
    console.warn("reverseGeocode failed:", err);
    return null;
  }
}
