import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ViewportHeightFix } from "@/components/viewport-height-fix";
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
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
    >
      {/*
        A altura vem de --app-height (medida em JS com window.innerHeight,
        ver ViewportHeightFix) em vez de 100dvh puro: no modo standalone do
        iOS, o valor inicial de 100dvh pode vir maior do que a viewport
        "assentada" final, só corrigindo depois do primeiro resize/gesto —
        isso criava um espaço vazio (ou bounce) embaixo de telas com shell
        de altura fixa. overflow-hidden aqui: o body nunca rola sozinho,
        quem rola é a área de conteúdo dentro de cada shell (ver
        app/layout.tsx e aluno/(portal)/layout.tsx).
      */}
      <body
        className="flex flex-col overflow-hidden bg-bg text-fg"
        style={{
          height: "var(--app-height, 100dvh)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <ViewportHeightFix />
        {children}
      </body>
    </html>
  );
}
