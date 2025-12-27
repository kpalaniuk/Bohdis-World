import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { GameWrapper } from "@/components/GameWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bohdi's World - 8-bit Adventure",
  description: "An 8-bit styled personal website featuring games, a calculator, and math challenges!",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-pixel-black text-white overflow-x-hidden">
        <AuthProvider>
          <GameWrapper>
            {children}
          </GameWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
