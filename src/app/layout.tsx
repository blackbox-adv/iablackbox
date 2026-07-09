import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/blackbox/providers";
import { ThemeProvider } from "@/components/site/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BLACKBOX · Encuentra la mejor oferta antes de comprar",
  description:
    "BLACKBOX compara precios entre Amazon, Temu y Falabella y te dice qué conviene comprar con recomendaciones de IA.",
  keywords: ["ofertas", "comparar precios", "Amazon", "Temu", "Falabella", "IA", "compras"],
  authors: [{ name: "BLACKBOX" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "BLACKBOX",
    description: "Encuentra la mejor oferta antes de comprar. Comparamos precios y te decimos qué conviene.",
    siteName: "BLACKBOX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BLACKBOX",
    description: "Encuentra la mejor oferta antes de comprar.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
            <SonnerToaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
