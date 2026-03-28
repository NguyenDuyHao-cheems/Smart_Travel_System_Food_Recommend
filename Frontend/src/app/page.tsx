import { Header } from "../components/Header";
import { HeroSection } from "../components/HeroSection";
import { BentoGrid } from "../components/BentoGrid";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white selection:bg-amber-500/30 overflow-x-hidden">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-amber-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-cyan-900/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10">
        <Header />
        <main className="flex flex-col gap-16 pb-24">
          <HeroSection />
          <div className="container mx-auto px-6 lg:px-12 max-w-7xl">
            <BentoGrid />
          </div>
        </main>

        <footer className="w-full border-t border-white/5 py-8 mt-12 text-center text-white/40 text-sm">
          <p>© 2026 TASTE&TRAVEL AI. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
