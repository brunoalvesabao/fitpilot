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
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
    >
      {/*
        Sem altura forçada (nem h-full nem h-dvh) de propósito: no modo
        standalone do iOS, forçar a altura da página pra bater com a
        viewport inteira cria uma rolagem fantasma em páginas curtas (o
        valor "assentado" pelo iOS muda sutilmente depois do primeiro
        gesto de rolagem). Deixando altura natural, a página só rola se
        o conteúdo realmente precisar — o CSS já estende a cor de fundo
        do body pra tela toda mesmo quando o conteúdo é mais curto que
        ela. As barras de abas continuam fixas (position: fixed), o que
        não depende da altura do documento.
      */}
      <body
        className="flex flex-col bg-bg text-fg"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {children}
      </body>
    </html>
  );
}
