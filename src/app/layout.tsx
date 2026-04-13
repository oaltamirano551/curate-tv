import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CurateTV — Build Your Perfect IPTV Playlist",
  description: "Curate, organize, and share your IPTV channels. Bring your own credentials, we handle the rest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable}`} data-theme="night">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
