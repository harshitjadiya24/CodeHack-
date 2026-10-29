import type { MetadataRoute } from "next";

// Installable on phones: opens straight to Discover, in its own window, in the Common Room colours.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baanto: borrow the lab next door",
    short_name: "Baanto",
    description: "Find idle campus equipment you're cleared for, book a fair slot, and show your Trust Passport at the lab desk.",
    start_url: "/resources",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "en-IN",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My Trust Passport", short_name: "Passport", url: "/passport", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My bookings", short_name: "Bookings", url: "/bookings", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
