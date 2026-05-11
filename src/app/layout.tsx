import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Chatbot } from "@/components/chatbot";
import { AuthGateProvider } from "@/components/auth-gate";
import { SabbathProvider } from "@/components/sabbath-toggle";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HolyFlex — AI Tools for Latter-day Saints",
  description:
    "Faith-positive AI tools to help Latter-day Saints prepare talks, study Come Follow Me, and strengthen their families.",
  keywords: ["LDS", "Latter-day Saints", "Come Follow Me", "sacrament talk", "Family Home Evening", "AI", "gospel study"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${sourceSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "#FDFAF5" }} suppressHydrationWarning>
        <SabbathProvider>
          <AuthGateProvider>
            <Nav />
            <main className="flex-1">{children}</main>
            <Chatbot />
            <OnboardingProvider />
            <footer className="border-t py-6 text-center text-xs" style={{ background: "#F0EBF8", borderColor: "#DDD5F0", color: "#8B7EC0" }}>
              <p>HolyFlex is an independent tool and is not affiliated with The Church of Jesus Christ of Latter-day Saints.</p>
              <p className="mt-1">All AI-generated content is a starting point — please seek personal revelation and the guidance of the Holy Ghost.</p>
            </footer>
          </AuthGateProvider>
        </SabbathProvider>
      </body>
    </html>
  );
}
