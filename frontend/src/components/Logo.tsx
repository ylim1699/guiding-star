interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

export default function Logo({ variant = "light", size = "md" }: LogoProps) {
  const heights = { sm: 24, md: 30, lg: 40 };
  const fSizes  = { sm: "17px", md: "22px", lg: "28px" };
  const h = heights[size];
  const w = Math.round(h * 44 / 36);   // viewBox 44w × 36h

  const col  = variant === "dark" ? "#ffffff"              : "#1D4ED8";
  const glow = variant === "dark" ? "rgba(255,255,255,"    : "rgba(29,78,216,";
  const word = variant === "dark" ? "#ffffff"              : "#1a1b23";

  // Elongated 4-pointed north star — vertical 13, horizontal 9, inner r≈2.2
  const star = "M31,1 L33.2,11.8 L40,14 L33.2,16.2 L31,27 L28.8,16.2 L22,14 L28.8,11.8 Z";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", userSelect: "none" }}>
      {/* Render at 2× physical pixels, display at 1× — crisp on all screens */}
      <svg
        width={w * 2} height={h * 2}
        viewBox="0 0 44 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        style={{ width: w, height: h, flexShrink: 0 }}
      >

        {/* Glow bloom */}
        <circle cx="31" cy="14" r="15" fill={`${glow}0.1)`}/>
        <circle cx="31" cy="14" r="9"  fill={`${glow}0.18)`}/>

        {/* Dashed comet tails — 2 parallel lines going lower-left */}
        <line
          x1="26" y1="18" x2="5"  y2="34"
          stroke={col} strokeWidth="3" strokeLinecap="round"
          strokeDasharray="6.5 4" opacity="0.88"
        />
        <line
          x1="23.5" y1="20.5" x2="3" y2="35"
          stroke={col} strokeWidth="2" strokeLinecap="round"
          strokeDasharray="6.5 4" strokeDashoffset="5" opacity="0.5"
        />

        {/* Elongated 4-pointed star */}
        <path d={star} fill={col}/>

        {/* Bright core highlight */}
        <circle cx="31" cy="14" r="2.8" fill={variant === "dark" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.9)"}/>
      </svg>

      <span style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontSize:      fSizes[size],
        fontWeight:    700,
        color:         word,
        letterSpacing: "-0.03em",
      }}>
        Comet
      </span>
    </div>
  );
}
