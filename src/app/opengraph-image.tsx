import { ImageResponse } from "next/og";

export const alt = "Saajha: every lab on campus, on one chart";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pull just the glyphs we draw from Google Fonts. If that fails, the card still renders in the default face.
async function anek(family: "Anek Latin" | "Anek Devanagari", text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(" ", "+")}:wdth,wght@75,800&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Share card: the station board, as on the landing page. */
export default async function OpengraphImage() {
  const headline = "Every lab on campus, on one chart.";
  const [latin, deva] = await Promise.all([anek("Anek Latin", `SAAJHA NFIT ${headline} Saajha`), anek("Anek Devanagari", "साझा")]);
  const fonts = [
    ...(latin ? [{ name: "Anek", data: latin, weight: 800 as const }] : []),
    ...(deva ? [{ name: "AnekDeva", data: deva, weight: 800 as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f6f6f3", padding: 56, fontFamily: "Anek" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            background: "#f2c230",
            border: "6px solid #141414",
            borderRadius: 10,
            padding: "28px 40px",
            boxShadow: "inset 0 0 0 8px #f2c230, inset 0 0 0 11px #141414",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", color: "#141414" }}>
            <div style={{ fontFamily: "AnekDeva", fontSize: 92, lineHeight: 1 }}>साझा</div>
            <div style={{ fontSize: 168, lineHeight: 0.86, letterSpacing: -2 }}>SAAJHA</div>
          </div>
          <div style={{ fontSize: 72, color: "#141414", paddingBottom: 14 }}>NFIT</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 13%" }}>
          <div style={{ width: 18, height: 34, background: "#2b2b28" }} />
          <div style={{ width: 18, height: 34, background: "#2b2b28" }} />
        </div>
        <div style={{ marginTop: 34, fontSize: 64, color: "#141414", lineHeight: 1, letterSpacing: -1 }}>{headline}</div>
      </div>
    ),
    { ...size, fonts },
  );
}
