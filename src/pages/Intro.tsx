import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { DotBackground } from "@/components/lightswind/grid-dot-background";
import SmokeyCursor from "@/components/lightswind/smokey-cursor";
import { AuroraTextEffect } from "@/components/lightswind/aurora-text-effect";
import { BorderBeam } from "@/components/lightswind/border-beam";

export default function Intro() {
  // Chặn scroll ở trang intro (an toàn nhất)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="relative h-[100svh] overflow-hidden"> {/* 1) One-page, no scroll */}
      {/* 2) Header overlay, không chiếm chỗ */}
      <div className="absolute inset-x-0 top-0 z-40">
        <Header />
      </div>

      {/* BG phủ toàn màn hình, dưới mọi thứ */}
      <DotBackground
        dotSize={1.5}
        dotColor="#ffffff"
        darkDotColor="#404040"
        spacing={22}
        showFade
        fadeIntensity={28}
        className="fixed inset-0 -z-10 pointer-events-none"
      />

      {/* 3) Center tuyệt đối theo viewport */}
      <main className="grid h-[100svh] place-items-center overscroll-none px-4">
        <section className="text-center max-w-2xl">
          <SmokeyCursor />
          <AuroraTextEffect 
            text="Zeusato Utilities"
            fontSize="clamp(3rem, 6vw, 5rem)"
            colors={{ first:"bg-cyan-400", second:"bg-yellow-400", third:"bg-green-400", fourth:"bg-purple-500" }}
            blurAmount="blur-lg"
          />
          <p className="mt-4 text-white/80">All tools in one place</p>

          <div className="mt-8">
            <Link
              to="/app"
              className="inline-block rounded-2xl px-6 py-3 font-semibold border border-white/20 bg-white/10 backdrop-blur
                         shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-white/15 hover:shadow-[0_0_35px_rgba(56,189,248,0.65)]
                         focus:outline-none focus:ring-2 focus:ring-cyan-400/70 transition"
            >
              Enter Workspace
              <BorderBeam colorFrom="#7400ff" colorTo="#9b41ff" size={50} duration={6} borderThickness={2} glowIntensity={0} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
