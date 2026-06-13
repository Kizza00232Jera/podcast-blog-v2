import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";
import SplashScreen from "./components/ui/SplashScreen";

// Crisp geometric sans for UI, reading-comfortable serif for article bodies.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Echonotes - podcast summaries by Claude",
  description:
    "Paste a YouTube podcast link and get a rich, readable written summary.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Echonotes",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F0F12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${newsreader.variable}`}>
      <body className="antialiased">
        <SplashScreen />
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#FFB347",
              colorBackground: "#17171C",
              colorForeground: "#F2F1ED",
              colorInput: "#1F1F27",
              colorInputForeground: "#F2F1ED",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
