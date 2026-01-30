import { GoogleAnalytics } from "@next/third-parties/google"
import type { Metadata, Viewport } from "next"
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"
import { DiagramProvider } from "@/contexts/diagram-context"
import { DictionaryProvider } from "@/hooks/use-dictionary"
import { i18n } from "@/lib/i18n/config"
import { getDictionary } from "@/lib/i18n/dictionaries"

import "./globals.css"

const plusJakarta = Plus_Jakarta_Sans({
    variable: "--font-sans",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
})

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-mono",
    subsets: ["latin"],
    weight: ["400", "500"],
})

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}

export const metadata: Metadata = {
    title: "AI Diagram Generator",
    description:
        "Create AWS architecture diagrams, flowcharts, and technical diagrams using AI. Free online tool integrating draw.io with AI assistance for professional diagram creation.",
    keywords: [
        "AI diagram generator",
        "AWS architecture",
        "flowchart creator",
        "draw.io",
        "AI drawing tool",
        "technical diagrams",
        "diagram automation",
        "free diagram generator",
        "online diagram maker",
    ],
    authors: [{ name: "AI Diagram Generator" }],
    creator: "AI Diagram Generator",
    publisher: "AI Diagram Generator",
    openGraph: {
        title: "AI Diagram Generator",
        description:
            "Create AWS architecture diagrams, flowcharts, and technical diagrams using AI.",
        type: "website",
        locale: "en_US",
        images: [
            {
                url: "/architecture.png",
                width: 1200,
                height: 630,
                alt: "AI Diagram Generator - AI-powered diagram creation tool",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "AI Diagram Generator",
        description:
            "Create AWS architecture diagrams, flowcharts, and technical diagrams using AI.",
        images: ["/architecture.png"],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    icons: {
        icon: "/favicon.ico",
    },
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const dictionary = await getDictionary(i18n.defaultLocale)

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "AI Diagram Generator",
        applicationCategory: "DesignApplication",
        operatingSystem: "Web Browser",
        description:
            "AI-powered diagram generator with targeted XML editing capabilities that integrates with draw.io for creating AWS architecture diagrams, flowcharts, and technical diagrams. Features diagram history, multi-provider AI support, and real-time collaboration.",
        inLanguage: "en",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
        },
    }

    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body
                className={`${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}
            >
                <DictionaryProvider dictionary={dictionary}>
                    <DiagramProvider>{children}</DiagramProvider>
                </DictionaryProvider>
            </body>
            {process.env.NEXT_PUBLIC_GA_ID && (
                <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
            )}
        </html>
    )
}
