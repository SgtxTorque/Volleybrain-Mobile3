import { PhoneShowcase } from "@/components/phone-showcase"

export default function Page() {
  return (
    <main className="min-h-screen bg-[#080E1A]">
      {/* Header */}
      <div className="text-center pt-16 pb-12 px-6">
        <div className="flex items-center justify-center gap-3 mb-6">
          <p className="text-[28px] font-extrabold tracking-tight text-[#4BB9EC]">lynx</p>
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#4BB9EC]/40 bg-[#4BB9EC]/8 px-3 py-1 rounded-full border border-[#4BB9EC]/15">
            Design Explorations
          </span>
        </div>
        <h1 className="text-[clamp(28px,4vw,44px)] font-extrabold text-white leading-tight tracking-tight text-balance mb-3">
          Parent Home Dashboard
        </h1>
        <p className="text-[16px] text-white/40 max-w-[600px] mx-auto leading-relaxed font-medium">
          5 structurally different layout explorations for the parent-facing home screen.
          Each design contains the same content blocks arranged with distinct visual hierarchy.
        </p>
      </div>

      {/* Phone Showcase */}
      <PhoneShowcase />

      {/* Footer */}
      <div className="text-center py-12 px-6">
        <p className="text-[12px] text-white/20 font-medium">
          Lynx Youth Sports App &middot; Parent Dashboard Concepts
        </p>
      </div>
    </main>
  )
}
