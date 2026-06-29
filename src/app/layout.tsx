import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import { SwUpdateToast } from "@/components/pwa/sw-update-toast";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Personal Finance",
  description: "Single-user VN personal finance PWA",
  // PWA install metadata. `appleWebApp.capable` is Next's typed equivalent of the
  // legacy `<meta name="apple-mobile-web-app-capable">` so iOS launches standalone
  // when the user adds to home screen (Share → Add to Home Screen — no in-app
  // prompt, since iOS has no beforeinstallprompt).
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tài chính",
  },
};

// Theme-color follows the OS scheme so the browser/PWA chrome bar matches the
// app background in both light and dark. No maximumScale/userScalable — pinch
// zoom stays available.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#15161a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body>
        {children}
        <SwUpdateToast />
      </body>
    </html>
  );
}
