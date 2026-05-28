import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ReduxProvider } from "./providers";
import { HelpButton } from "@/components/HelpButton";
import { ConfigureAmplify } from "@/lib/config/ConfigureAmplify";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HIKIGAI AIScribe",
  description: "AI-powered medical transcription and documentation",
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
      <body className="min-h-full flex flex-col">
        <ReduxProvider>
          <ConfigureAmplify />
          {children}
          <HelpButton />
          <Toaster position="top-right" richColors />
        </ReduxProvider>
      </body>
    </html>
  );
}
