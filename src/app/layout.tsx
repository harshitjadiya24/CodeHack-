import type { Metadata, Viewport } from "next";
import { Mona_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Mona Sans (GitHub), OFL. One variable family: set wide and heavy it is the headline, normal width it is the text.
const mona = Mona_Sans({ variable: "--font-mona", subsets: ["latin"], axes: ["wdth"], display: "swap" });
// Only for the odd Hindi word; not preloaded.
const deva = Noto_Sans_Devanagari({ variable: "--font-deva-src", subsets: ["devanagari"], display: "swap", preload: false });

export const metadata: Metadata = {
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("saajha-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body className={`${mona.variable} ${deva.variable} antialiased`}>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
