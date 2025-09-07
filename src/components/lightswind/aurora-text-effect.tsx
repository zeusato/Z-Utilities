import React from "react";
import { cn } from "../lib/utils"; // Assuming 'cn' is a utility for merging class names

export interface AuroraTextEffectProps {
  text: string;
  className?: string;
  textClassName?: string;
  fontSize?: string;
  colors?: {
    first?: string;
    second?: string;
    third?: string;
    fourth?: string;
  };
  blurAmount?:
    | "blur-none"
    | "blur-sm"
    | "blur-md"
    | "blur-lg"
    | "blur-xl"
    | "blur-2xl"
    | "blur-3xl"
    | string;
  animationSpeed?: {
    border?: number;
    first?: number;
    second?: number;
    third?: number;
    fourth?: number;
  };
}

export function AuroraTextEffect({
  text,
  className,
  textClassName,
  fontSize = "clamp(3rem, 8vw, 7rem)",
  colors = {
    first: "bg-cyan-400",
    second: "bg-yellow-400",
    third: "bg-green-400",
    fourth: "bg-purple-500",
  },
  blurAmount = "blur-lg",
  animationSpeed = {
    border: 6,
    first: 5,
    second: 5,
    third: 3,
    fourth: 13,
  },
}: AuroraTextEffectProps) {
  // Define keyframes as a style object
  const keyframes = `
    @keyframes aurora-1 {
      0% { top: 0; right: 0; }
      50% { top: 100%; right: 75%; }
      75% { top: 100%; right: 25%; }
      100% { top: 0; right: 0; }
    }
    @keyframes aurora-2 {
      0% { top: -50%; left: 0%; }
      60% { top: 100%; left: 75%; }
      85% { top: 100%; left: 25%; }
      100% { top: -50%; left: 0%; }
    }
    @keyframes aurora-3 {
      0% { bottom: 0; left: 0; }
      40% { bottom: 100%; left: 75%; }
      65% { bottom: 40%; left: 50%; }
      100% { bottom: 0; left: 0; }
    }
    @keyframes aurora-4 {
      0% { bottom: -50%; right: 0; }
      50% { bottom: 0%; right: 40%; }
      90% { bottom: 50%; right: 25%; }
      100% { bottom: -50%; right: 0; }
    }
    @keyframes aurora-border {
      0% { border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%; }
      25% { border-radius: 47% 29% 39% 49% / 61% 19% 66% 26%; }
      50% { border-radius: 57% 23% 47% 72% / 63% 17% 66% 33%; }
      75% { border-radius: 28% 49% 29% 100% / 93% 20% 64% 25%; }
      100% { border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%; }
    }
  `;

  return (
    <div
      className={cn(
        // Updated to support light and dark modes
        "bg-transparent flex items-center justify-center overflow-hidden",
        className
      )}
    >
      <style>{keyframes /* This injects the keyframes into the DOM */}</style>
      <div className="text-center">
        <h1
          className={cn(
            // Added theme-aware text color for visibility
            "font-extrabold tracking-tight relative overflow-hidden text-black dark:text-white",
            textClassName
          )}
          style={{ fontSize }}
        >
          {text}
          <div
            // Switched blend mode based on theme to preserve the effect
            className="absolute inset-0 z-10 mix-blend-lighten dark:mix-blend-darken pointer-events-none"
          >
            {/* First Aurora Layer */}
            <div
              className={cn(
                "absolute w-[60vw] h-[60vw] rounded-[37%_29%_27%_27%/28%_25%_41%_37%] filter mix-blend-overlay",
                colors.first || "bg-cyan-400",
                blurAmount
              )}
              style={{
                animationName: "aurora-border, aurora-1",
                animationDuration: `${animationSpeed.border}s, ${animationSpeed.first}s`,
                animationTimingFunction: "ease-in-out, ease-in-out",
                animationIterationCount: "infinite, infinite",
                animationDirection: "normal, alternate",
              }}
            />

            {/* Second Aurora Layer */}
            <div
              className={cn(
                "absolute w-[60vw] h-[60vw] rounded-[37%_29%_27%_27%/28%_25%_41%_37%] filter mix-blend-overlay",
                colors.second,
                blurAmount
              )}
              style={{
                animationName: "aurora-border, aurora-2",
                animationDuration: `${animationSpeed.border}s, ${animationSpeed.second}s`,
                animationTimingFunction: "ease-in-out, ease-in-out",
                animationIterationCount: "infinite, infinite",
                animationDirection: "normal, alternate",
              }}
            />

            {/* Third Aurora Layer */}
            <div
              className={cn(
                "absolute w-[60vw] h-[60vw] rounded-[37%_29%_27%_27%/28%_25%_41%_37%] filter mix-blend-overlay",
                colors.third,
                blurAmount
              )}
              style={{
                animationName: "aurora-border, aurora-3",
                animationDuration: `${animationSpeed.border}s, ${animationSpeed.third}s`,
                animationTimingFunction: "ease-in-out, ease-in-out",
                animationIterationCount: "infinite, infinite",
                animationDirection: "normal, alternate",
              }}
            />

            {/* Fourth Aurora Layer */}
            <div
              className={cn(
                "absolute w-[60vw] h-[60vw] rounded-[37%_29%_27%_27%/28%_25%_41%_37%] filter mix-blend-overlay",
                colors.fourth,
                blurAmount
              )}
              style={{
                animationName: "aurora-border, aurora-4",
                animationDuration: `${animationSpeed.border}s, ${animationSpeed.fourth}s`,
                animationTimingFunction: "ease-in-out, ease-in-out",
                animationIterationCount: "infinite, infinite",
                animationDirection: "normal, alternate",
              }}
            />
          </div>
        </h1>
      </div>
    </div>
  );
}