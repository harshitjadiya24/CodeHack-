import type { Metadata, Viewport } from "next";
import { Mona_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorker } from "@/components/service-worker";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Mona Sans (GitHub), OFL. One variable family: set wide and heavy it is the headline, normal width it is the text.
const mona = Mona_Sans({ variable: "--font-mona", subsets: ["latin"], axes: ["wdth"], display: "swap" });
// Only for the odd Hindi word; not preloaded.
// Hindi pages need it straight away; it stays off the critical path for English readers via the unicode-range subset.
const deva = Noto_Sans_Devanagari({ variable: "--font-deva-src", subsets: ["devanagari"], weight: ["400", "600", "700", "800"], display: "swap", preload: false });

export const metadata: Metadata = {
  appleWebApp: { capable: true, title: "Saajha", statusBarStyle: "default" },
  title: { default: "Saajha: borrow the lab next door", template: "%s · Saajha" },
  description:
    "Saajha opens idle campus labs and equipment to students. See what you are cleared for, book a slot, and when too many people want the same hour, a fair draw anyone can check decides.",
};

// Status bar matches the page in both themes.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181a" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale === "hi" ? "hi-IN" : "en-IN"} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("saajha-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body className={`${mona.variable} ${deva.variable} antialiased`}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Toaster position="top-center" richColors closeButton />
        <ServiceWorker />
      </body>
    </html>
  );
}
