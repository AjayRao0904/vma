import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import { ProjectProvider } from "./contexts/ProjectContext";
import { StudioProvider } from "./contexts/StudioContext";
import HydrationFixProvider from "./components/HydrationFixProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Aalap",
  description: "Fast, personal, and deeply human in its emotional depth",
  icons: {
    icon: '/next.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <HydrationFixProvider>
          <AuthProvider>
            <ProjectProvider>
              <StudioProvider>
                {children}
              </StudioProvider>
            </ProjectProvider>
          </AuthProvider>
        </HydrationFixProvider>
      </body>
    </html>
  );
}
