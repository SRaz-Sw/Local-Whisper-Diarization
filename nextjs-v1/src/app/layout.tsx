import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import HomeNavbar from "@/components/home-navbar/HomeNavbar";
import HomeSidebar from "@/components/home-navbar/HomeSidebar";
import ProvidersClientSide from "./providers";
import { Toaster } from "sonner";
import { FileUploadedData } from "@sraz-sw/carwise-shared";
import "../lib/oRPC/clients/orpc.server"; // for oRPC pre-rendering (SSR)
// Required CSS for UploadThing with Tailwind v4
import "uploadthing/tw/v4";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:
    "Whisper Diarization - Speech-to-Text with Speaker Identification",
  description:
    "Professional speech-to-text transcription with automatic speaker diarization. Works completely offline using state-of-the-art AI models. Available as desktop app or web version.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        <ProvidersClientSide>
          <SidebarProvider>
            <div className="relative w-full">
              {/* <HomeNavbar /> */}
              <div className="flex h-full max-h-svh max-w-svw pt-[4rem]">
                {/* <HomeSidebar /> */}
                <main className="w-full">{children}</main>
                <Toaster position="top-center" />
              </div>
            </div>
          </SidebarProvider>
        </ProvidersClientSide>
      </body>
    </html>
  );
}
