import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Anek_Latin } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Anek by Ek Type (Mumbai), OFL. One variable family; the width axis does the work of a second face.
const anek = Anek_Latin({ variable: "--font-anek", subsets: ["latin"], axes: ["wdth"], display: "swap" });
const anekDeva = Anek_Devanagari({ variable: "--font-anek-deva", subsets: ["devanagari"], axes: ["wdth"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "Saajha: every lab on campus, on one chart", template: "%s · Saajha" },
  description:
    "Saajha opens idle campus labs and equipment to students. See what you are cleared for, book a slot, and when too many people want the same hour, a fair draw anyone can check decides.",
};

// Status bar matches the page in both themes.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("saajha-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body className={`${anek.variable} ${anekDeva.variable} antialiased`}>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
