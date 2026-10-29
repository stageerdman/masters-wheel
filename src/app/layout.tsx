import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AIAssistant } from "@/elements/AIAssistant/AIAssistant";
import { AppHeader } from "@/elements/AppHeader/AppHeader";
import { HeaderActionsProvider } from "@/elements/AppHeader/AppHeader.context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Master's Circle",
  description: "Mastery platform prototype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>
        <HeaderActionsProvider>
          <AppHeader />
          {children}
        </HeaderActionsProvider>
        <AIAssistant />
      </body>
    </html>
  );
}
