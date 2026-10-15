import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitPilot",
  description: "Gestão para personal trainers autônomos",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitPilot",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  other: {
    // Next.js's appleWebApp.capable only emits the unprefixed
    // "mobile-web-app-capable" tag; iOS Safari's standalone-mode
    // detection still keys off the Apple-prefixed tag specifically,
    // so it has to be added explicitly.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0d10",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} dark h-dvh antialiased`}
    >
      <body
        className="h-dvh flex flex-col bg-bg text-fg"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {children}
      </body>
    </html>
  );
}
