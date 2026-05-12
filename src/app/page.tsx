"use client";

import { Button } from "@/components/ui/button";
import { Flame, Play, Radio, Users, Music, ShoppingBag, ArrowRight, Sparkles, Globe } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050507] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 h-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Artbook</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/feed">
            <Button variant="ghost">Explore</Button>
          </Link>
          <Link href="/feed">
            <Button>
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 lg:pt-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm mb-8">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Discover Africa&apos;s Next Generation of Artists
        </div>

        <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
          Where Music
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Meets Culture
          </span>
        </h1>

        <p className="text-white/50 text-lg lg:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">
          A platform built for discovery. Upload your music, go live, connect with fans,
          and be part of Africa&apos;s creative revolution.
        </p>

        <div className="flex items-center justify-center gap-4 mt-10">
          <Link href="/feed">
            <Button size="lg" className="text-base px-8">
              <Play className="w-5 h-5" />
              Start Exploring
            </Button>
          </Link>
          <Link href="/upload">
            <Button variant="outline" size="lg" className="text-base px-8">
              Upload Your Music
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-12 mt-16 text-center">
          <div>
            <p className="text-3xl font-bold text-white">50K+</p>
            <p className="text-white/40 text-sm mt-1">Artists</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <p className="text-3xl font-bold text-white">2M+</p>
            <p className="text-white/40 text-sm mt-1">Tracks</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <p className="text-3xl font-bold text-white">180+</p>
            <p className="text-white/40 text-sm mt-1">Countries</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Everything You Need</h2>
          <p className="text-white/40 mt-3 text-lg">One platform. Infinite possibilities.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Music,
              title: "Music & Content",
              desc: "Upload audio and video. Categorize by genre, mood, and niche. Build your catalog.",
              color: "from-indigo-500/20 to-indigo-500/5",
              iconColor: "text-indigo-400",
            },
            {
              icon: Radio,
              title: "Live Streaming",
              desc: "Go live, receive gifts, interact with fans in real-time. Schedule and save streams.",
              color: "from-red-500/20 to-red-500/5",
              iconColor: "text-red-400",
            },
            {
              icon: Users,
              title: "Community",
              desc: "Create groups, share status updates, DM fans and fellow artists. Build your tribe.",
              color: "from-emerald-500/20 to-emerald-500/5",
              iconColor: "text-emerald-400",
            },
            {
              icon: ShoppingBag,
              title: "Marketplace",
              desc: "Sell merch, digital products, and exclusive content. Monetize your creativity.",
              color: "from-amber-500/20 to-amber-500/5",
              iconColor: "text-amber-400",
            },
            {
              icon: Globe,
              title: "Discovery",
              desc: "Algorithm that prioritizes local creators and niche interests. Be found, not lost.",
              color: "from-cyan-500/20 to-cyan-500/5",
              iconColor: "text-cyan-400",
            },
            {
              icon: Sparkles,
              title: "Adaptive Experience",
              desc: "Colors and UI adapt to artist vibes, genre moods. Every profile feels unique.",
              color: "from-purple-500/20 to-purple-500/5",
              iconColor: "text-purple-400",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className={`p-6 rounded-2xl bg-gradient-to-br ${feature.color} border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300`}
            >
              <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
              <h3 className="text-white font-semibold text-lg mt-4">{feature.title}</h3>
              <p className="text-white/40 text-sm mt-2 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-32 text-center">
        <div className="p-12 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/[0.06]">
          <h2 className="text-3xl font-bold text-white">Ready to Share Your Art?</h2>
          <p className="text-white/40 mt-3 max-w-lg mx-auto">
            Join thousands of artists already building their audience on Artbook.
          </p>
          <Link href="/feed">
            <Button size="lg" className="mt-8 text-base px-10">
              Join Artbook
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6 text-center text-white/30 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-white/50">Artbook</span>
        </div>
        <p>&copy; 2026 Artbook. Built for artists, by artists.</p>
      </footer>
    </div>
  );
}
