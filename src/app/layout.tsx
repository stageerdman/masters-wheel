import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AIAssistant } from "@/elements/AIAssistant/AIAssistant";
import { AIAssistantVisibilityProvider } from "@/elements/AIAssistant/AIAssistant.context";
import { AppHeader } from "@/elements/AppHeader/AppHeader";
import { HeaderActionsProvider } from "@/elements/AppHeader/AppHeader.context";
import { SpacesProvider } from "@/lib/spaces";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Chat code blocks only — see globals.css's --font-family-mono. Prose
// stays on the single base font everywhere else.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Master's Wheel",
  description: "Mastery platform prototype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <SpacesProvider>
          <AIAssistantVisibilityProvider>
            <HeaderActionsProvider>
              <AppHeader />
              {children}
            </HeaderActionsProvider>
            <AIAssistant />
          </AIAssistantVisibilityProvider>
        </SpacesProvider>
      </body>
    </html>
  );
}
