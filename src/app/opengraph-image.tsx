import { ImageResponse } from "next/og";

export const alt = "Saajha: borrow the lab next door";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pull just the glyphs we draw from Google Fonts. If that fails, the card still renders in the default face.
async function mona(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Mona+Sans:wdth,wght@125,800&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

const TAGS = [
  { name: "Prusa MK4 printer", tag: "Free after 2 pm", bg: "#d6e8fa", ink: "#1d4f80", r: -4 },
  { name: "Zeiss microscope", tag: "You’re cleared", bg: "#dcebd7", ink: "#2c5a2a", r: 3 },
  { name: "Sony A7 IV kit", tag: "6 people asking", bg: "#fbefc4", ink: "#6b4e00", r: 2 },
];

/** Share card: the headline and three shelf tags, as on the landing page. */
export default async function OpengraphImage() {
  const headline = "Borrow the lab next door.";
  const font = await mona(`saajha ${headline} ${TAGS.map((t) => t.name + t.tag).join("")}`);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff", padding: 64, fontFamily: "Mona", color: "#1c1c1e" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ fontSize: 40, letterSpacing: -1 }}>saajha</div>
          <div style={{ fontSize: 104, lineHeight: 0.92, letterSpacing: -5 }}>{headline}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginLeft: 40, paddingTop: 30 }}>
          {TAGS.map((t) => (
            <div
              key={t.name}
              style={{ display: "flex", flexDirection: "column", background: t.bg, color: t.ink, borderRadius: 28, padding: "22px 26px", width: 380, transform: `rotate(${t.r}deg)` }}
            >
              <div style={{ fontSize: 30 }}>{t.name}</div>
              <div style={{ fontSize: 22, marginTop: 8 }}>{t.tag}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Mona", data: font, weight: 800 as const }] : [] },
  );
}
