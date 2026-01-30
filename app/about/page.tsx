import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
    title: "About - AI Diagram Generator",
    description:
        "AI-Powered Diagram Creation Tool - Chat, Draw, Visualize. Create AWS, GCP, and Azure architecture diagrams with natural language.",
    keywords: [
        "AI diagram",
        "draw.io",
        "AWS architecture",
        "GCP diagram",
        "Azure diagram",
        "LLM",
    ],
}

export default function About() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            {/* Navigation */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center justify-end">
                        <nav className="flex items-center gap-8 text-sm">
                            <Link
                                href="/"
                                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium"
                            >
                                Editor
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <article className="space-y-12">
                    {/* Title */}
                    <div className="text-center space-y-3">
                        <p className="text-xl text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto">
                            Create professional diagrams with AI assistance.
                            Describe what you need, and let AI build it for you.
                        </p>
                    </div>

                    {/* Quick Info */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                                Bring Your Own API Key
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Use your own API key with any supported
                                provider. Your credentials are stored locally in
                                your browser and never sent to our servers.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                                Multi-Provider Support
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Works with OpenAI, Anthropic, Google AI, Azure,
                                and many other AI providers.
                            </p>
                        </div>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 text-lg">
                        A powerful Next.js application that combines the power
                        of draw.io with AI. Create, modify, and enhance diagrams
                        through natural language commands and instant AI
                        visualization.
                    </p>

                    {/* Features */}
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                            Key Features
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex gap-3">
                                <div className="w-1 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full flex-shrink-0"></div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                                        AI-Powered Diagrams
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Create diagrams with natural language
                                        commands
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-1 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full flex-shrink-0"></div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                                        Image-Based Replication
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Upload images and replicate them
                                        automatically
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-1 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full flex-shrink-0"></div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                                        Version Control
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Full history tracking with easy
                                        restoration
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-1 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full flex-shrink-0"></div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                                        Animated Connectors
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Dynamic visualization with animations
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Examples */}
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                            Examples
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                <div className="h-40 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                    <Image
                                        src="/aws_demo.svg"
                                        alt="AWS Architecture Diagram"
                                        width={200}
                                        height={150}
                                        className="max-w-full max-h-full"
                                    />
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                                        AWS Architecture
                                    </h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        Design cloud infrastructure
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                <div className="h-40 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                    <Image
                                        src="/gcp_demo.svg"
                                        alt="GCP Architecture Diagram"
                                        width={200}
                                        height={150}
                                        className="max-w-full max-h-full"
                                    />
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                                        GCP Architecture
                                    </h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        Google Cloud deployments
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                <div className="h-40 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                    <Image
                                        src="/azure_demo.svg"
                                        alt="Azure Architecture Diagram"
                                        width={200}
                                        height={150}
                                        className="max-w-full max-h-full"
                                    />
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                                        Azure Architecture
                                    </h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        Microsoft cloud solutions
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technology Stack */}
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                            Technology
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Built with modern tools and technologies:
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                                    Frontend
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Next.js 16, React 19, TypeScript
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                                    AI Integration
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Vercel AI SDK with multi-provider support
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="text-center">
                        <Link
                            href="/"
                            className="inline-block bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
                        >
                            Open Editor
                        </Link>
                    </div>
                </article>
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                            AI-Powered Diagram Generator
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                            Built with Next.js • Powered by AI
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
