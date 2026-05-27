import type { Metadata, Viewport } from "next";
import { Geist, Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Body: clean grotesque. Display: characterful, slightly condensed. Mono: board/ticket.
const body = Geist({ subsets: ["latin"], variable: "--font-body" });
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono-board",
});

export const metadata: Metadata = {
  title: "Rail Atlas — BD Railway seats, every class & stop",
  description:
    "Live Bangladesh Railway seat availability across all classes and route segments. Split-ticket finder, multi-date search, and a departure-board view.",
  appleWebApp: { capable: true, title: "Rail Atlas", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080d0b" },
    { media: "(prefers-color-scheme: light)", color: "#eef3ef" },
  ],
};

// Inline pre-paint script so dark mode applies before first render — no flash.
const themeScript = `(function(){try{var k='railway_theme',s=localStorage.getItem(k);var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
