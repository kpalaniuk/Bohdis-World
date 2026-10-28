import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { GameWrapper } from "@/components/GameWrapper";
import "./globals.css";

const SITE_DESCRIPTION =
  "Bohdi's World is a student learning project: a kid learning to code and use AI by building math-based games, " +
  'with math practice, a calculator, word problems and coding projects.';

export const metadata: Metadata = {
  metadataBase: new URL('https://bohdi.palaniuk.net'),
  title: "Bohdi's World - Learn to Code, Use AI and Build Math Games",
  description: SITE_DESCRIPTION,
  keywords: [
    'education',
    'learning',
    'student project',
    'learn to code',
    'coding for kids',
    'AI literacy',
    'math practice',
    'math games',
    'word problems',
    'calculator',
  ],
  category: 'education',
  applicationName: "Bohdi's World",
  openGraph: {
    title: "Bohdi's World - Learn to Code, Use AI and Build Math Games",
    description: SITE_DESCRIPTION,
    url: 'https://bohdi.palaniuk.net',
    siteName: "Bohdi's World",
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: "Bohdi's World",
  url: 'https://bohdi.palaniuk.net',
  description: SITE_DESCRIPTION,
  genre: 'Education',
  keywords: 'education, learn to code, AI literacy, math practice, math games, word problems',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
  about: ['Computer programming', 'Artificial intelligence', 'Mathematics'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
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
