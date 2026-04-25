import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Chatbot } from "@/components/chatbot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "#FDFAF3" }} suppressHydrationWarning>
        <Nav />
        <main className="flex-1">{children}</main>
        <Chatbot />
        <footer className="border-t py-6 text-center text-xs" style={{ background: "#F5F0E8", borderColor: "#DDE8DD", color: "#7A9A7A" }}>
          <p>HolyFlex is an independent tool and is not affiliated with The Church of Jesus Christ of Latter-day Saints.</p>
          <p className="mt-1">All AI-generated content is a starting point — please seek personal revelation and the guidance of the Holy Ghost.</p>
        </footer>
      </body>
    </html>
  );
}
