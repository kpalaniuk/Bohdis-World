import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/contexts/AuthContext";
import { GameWrapper } from "@/components/GameWrapper";
import "./globals.css";

const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY;

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
  if (!clerkPublishableKey) {
    console.warn(
      "Clerk publishable key is missing. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (or CLERK_PUBLISHABLE_KEY) to enable authentication."
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      appearance={{
        variables: {
          colorPrimary: '#98D8AA',
          colorBackground: '#1a1a1a',
          colorText: '#ffffff',
          borderRadius: '0px',
        },
      }}
    >
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
    </ClerkProvider>
  );
}
