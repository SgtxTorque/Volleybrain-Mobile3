"use client"

import { PhoneFrame } from "./phone-frame"
import { V1AiryWelcome } from "./screens/v1-airy-welcome"
import { V2PhotoMagazine } from "./screens/v2-photo-magazine"
import { V3DashboardCards } from "./screens/v3-dashboard-cards"
import { V4ScrollStories } from "./screens/v4-scroll-stories"
import { V5NightMode } from "./screens/v5-night-mode"

const screens = [
  { label: "V1 \u00B7 Airy Welcome", component: V1AiryWelcome, dark: false },
  { label: "V2 \u00B7 Photo Magazine", component: V2PhotoMagazine, dark: true },
  { label: "V3 \u00B7 Dashboard Cards", component: V3DashboardCards, dark: false },
  { label: "V4 \u00B7 Scroll Stories", component: V4ScrollStories, dark: false },
  { label: "V5 \u00B7 Night Mode Premium", component: V5NightMode, dark: true },
]

export function PhoneShowcase() {
  return (
    <div className="w-full overflow-x-auto pb-8">
      <div className="flex gap-8 px-8 justify-start min-w-max lg:justify-center">
        {screens.map((screen) => (
          <PhoneFrame key={screen.label} label={screen.label} dark={screen.dark}>
            <screen.component />
          </PhoneFrame>
        ))}
      </div>
    </div>
  )
}
