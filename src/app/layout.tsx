import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/shared/ui/theme-provider"
import { TooltipProvider } from "@/shared/ui/tooltip"
import { Toaster } from "@/shared/ui/sonner"
import { QueryProvider } from "@/shared/providers/query-provider"
import { InstallPrompt } from "@/shared/ui/install-prompt"
import { cn } from "@/shared/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const APP_NAME = "웨스트짐"
const APP_DESCRIPTION = "헬스장 맞춤형 웨스트짐 플랫폼"

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      { url: "/appIcons/Assets.xcassets/AppIcon.appiconset/180.png", sizes: "180x180" },
      { url: "/appIcons/Assets.xcassets/AppIcon.appiconset/152.png", sizes: "152x152" },
      { url: "/appIcons/Assets.xcassets/AppIcon.appiconset/167.png", sizes: "167x167" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <QueryProvider>{children}</QueryProvider>
          </TooltipProvider>
          <Toaster position="top-center" />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
