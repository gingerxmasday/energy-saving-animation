import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from "remotion";

// ─── TIMING (frames at 30 fps) ───────────────────────────────────────────────
const S1_START = 0;
const S1_END   = 60;    // 2 s  (unchanged)
const S2_START = 60;    // 1 s  → ends at 90
const S3_START = 90;    // 1.67 s → ends at 140  (was 150)
const S4_START = 140;   // 1.33 s → ends at 180  (was 240)
const S5_START = 180;   // 4 s  → ends at 300    (was 360)

// ── NEW SCENES ──────────────────────────────────────────────────────────────
const S6_START = 300;   // 2 s  → 分鏡1: Dimming        (was 480)
const S7_START = 360;   // 4 s  → 分鏡2: Grid Gallery   (was 540, extended 60→120f)
const S8_START = 480;   // 2 s  → 分鏡3: Project focus  (was 600)
const S9_START = 540;   // 2 s  → 分鏡4: Comment        (was 660)
export const TOTAL_FRAMES = 600; // 20 s (was 720)

// ─── SPRING CONFIGS ───────────────────────────────────────────────────────────
// Remotion's SpringConfig uses stiffness (=tension) and damping (=friction)
const SPRING_SNAPPY = { stiffness: 120, damping: 14 };  // overshoot
const SPRING_CLICK  = { stiffness: 220, damping: 15 };  // quick snap-back

// ─── TYPEWRITER TEXT ─────────────────────────────────────────────────────────
const TEXT_A =
  "Let's design an interactive, dark themed graphic showing how energy-saving " +
  "protocols optimize power distribution across the smart grid";
const TEXT_B = " A rotating globe with the cities connected by glowing paths.";
// Typing speeds auto-scaled to condensed scene durations
const CHARS_PER_SEC_A = 78;  // TEXT_A: 130 chars / 1.67 s (S3 = 50 frames)
const CHARS_PER_SEC_B = 46;  // TEXT_B:  61 chars / 1.33 s (S4 = 40 frames)

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function localFrame(frame: number, sceneStart: number) {
  return Math.max(0, frame - sceneStart);
}

// Per-character fade-in rendered as individual spans
function FadingText({
  text,
  startFrame,
  frame,
  charsPerSec,
  fps,
}: {
  text: string;
  startFrame: number;
  frame: number;
  charsPerSec: number;
  fps: number;
}) {
  const framesPerChar = fps / charsPerSec;
  const charsToShow = Math.min(
    text.length,
    Math.floor((frame - startFrame) / framesPerChar) + 1
  );

  return (
    <>
      {text.split("").slice(0, charsToShow).map((char, i) => {
        const charAppearsAt = startFrame + i * framesPerChar;
        const age = Math.max(0, frame - charAppearsAt);
        const opacity = Math.min(1, age / 5);
        return (
          <span key={i} style={{ opacity }}>
            {char}
          </span>
        );
      })}
    </>
  );
}

// ─── GLOBE SVG ───────────────────────────────────────────────────────────────
function GlobeSVG({ s4Frame, fps }: { s4Frame: number; fps: number }) {
  const rotateY = Math.sin((s4Frame / fps) * 0.9) * 22;
  const rotateX = 15;
  const dashOffset = -(s4Frame * 1.8);

  const slideProgress = interpolate(s4Frame, [0, 55], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(slideProgress, [0, 1], [200, 0]);
  const opacity    = interpolate(slideProgress, [0, 1], [0,   1]);

  const cities: [number, number][] = [
    [-70, -35],
    [ 55, -25],
    [ 20,  75],
    [-45,  15],
    [ 68,  18],
  ];

  const arcs = [
    "M -70 -35 Q -10 -85 55 -25",
    "M  55 -25 Q  75  35 20  75",
    "M  20  75 Q -55  55 -70 -35",
    "M -45  15 Q   5 -65 68  18",
    "M  68  18 Q  80  55 20  75",
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: "7%",
        top: "50%",
        transform: `translateY(-50%) translateX(${translateX}px)`,
        opacity,
      }}
    >
      <svg
        width="300"
        height="300"
        viewBox="-140 -140 280 280"
        style={{
          transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          filter: "drop-shadow(0 0 30px rgba(0,200,255,0.3))",
          overflow: "visible",
        }}
      >
        <defs>
          <radialGradient id="sphereGrad" cx="35%" cy="32%" r="68%">
            <stop offset="0%"   stopColor="#1e4580" />
            <stop offset="55%"  stopColor="#0b1e40" />
            <stop offset="100%" stopColor="#020d1f" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base sphere */}
        <circle cx="0" cy="0" r="130" fill="url(#sphereGrad)" />

        {/* Latitude rings */}
        {[-65, -35, 0, 35, 65].map((lat, i) => {
          const y  = 130 * Math.sin((lat * Math.PI) / 180);
          const rx = Math.abs(130 * Math.cos((lat * Math.PI) / 180));
          return (
            <ellipse
              key={`lat-${i}`}
              cx="0" cy={y}
              rx={rx} ry={rx * 0.18}
              fill="none"
              stroke="rgba(100,200,255,0.12)"
              strokeWidth="0.7"
            />
          );
        })}

        {/* Longitude arcs */}
        {[0, 30, 60, 90, 120, 150].map((lon, i) => (
          <ellipse
            key={`lon-${i}`}
            cx="0" cy="0"
            rx={Math.max(0, 130 * Math.abs(Math.cos((lon * Math.PI) / 180)))}
            ry="130"
            fill="none"
            stroke="rgba(100,200,255,0.12)"
            strokeWidth="0.7"
            transform={`rotate(${lon})`}
          />
        ))}

        {/* Glowing flowing arcs */}
        {arcs.map((d, i) => (
          <path
            key={`arc-${i}`}
            d={d}
            fill="none"
            stroke="#00d4ff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="10 5"
            strokeDashoffset={dashOffset + i * 18}
            filter="url(#glow)"
            opacity="0.85"
          />
        ))}

        {/* City nodes */}
        {cities.map(([cx, cy], i) => (
          <circle
            key={`city-${i}`}
            cx={cx} cy={cy}
            r="5"
            fill="#00d4ff"
            filter="url(#glow)"
            opacity="0.95"
          />
        ))}

        {/* Sphere rim highlight */}
        <circle
          cx="0" cy="0" r="130"
          fill="none"
          stroke="rgba(0,180,255,0.18)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

// ─── FROSTED GLASS INPUT WINDOW ──────────────────────────────────────────────
function InputWindow({
  windowSpring,
  frame,
  showTextA,
  showTextB,
  fps,
  charsPerSecA,
  charsPerSecB,
}: {
  windowSpring: number;
  frame: number;
  showTextA: boolean;
  showTextB: boolean;
  fps: number;
  charsPerSecA: number;
  charsPerSecB: number;
}) {
  const translateY = interpolate(windowSpring, [0, 1], [90, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(1, windowSpring * 1.4);
  const cursorVisible = frame % 18 < 10;   // frame-based blink

  return (
    <div
      style={{
        position: "absolute",
        bottom: "12%",
        left: showTextB ? "8%" : "50%",
        transform: showTextB
          ? `translateY(${translateY}px)`
          : `translateX(-50%) translateY(${translateY}px)`,
        width: showTextB ? "52%" : "680px",
        opacity,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "18px",
          padding: "20px 26px",
          boxShadow:
            "0 10px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: "7px", marginBottom: "14px" }}>
          {(
            [
              "rgba(255,95,87,0.7)",
              "rgba(255,189,46,0.7)",
              "rgba(40,205,65,0.7)",
            ] as string[]
          ).map((bg, i) => (
            <div
              key={i}
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: bg,
              }}
            />
          ))}
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.35)",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Prompt
        </div>

        {/* Text area with input styling */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "10px",
            padding: "14px 16px",
            border: "1px solid rgba(255,255,255,0.07)",
            minHeight: "72px",
            color: "rgba(255,255,255,0.88)",
            fontFamily:
              "'SF Mono', 'Fira Code', 'Courier New', monospace",
            fontSize: "14px",
            lineHeight: "1.65",
            letterSpacing: "0.015em",
          }}
        >
          {showTextA && (
            <FadingText
              text={TEXT_A}
              startFrame={S3_START}
              frame={frame}
              charsPerSec={charsPerSecA}
              fps={fps}
            />
          )}
          {showTextB && (
            <FadingText
              text={TEXT_B}
              startFrame={S4_START}
              frame={frame}
              charsPerSec={charsPerSecB}
              fps={fps}
            />
          )}
          {cursorVisible && (
            <span
              style={{
                display: "inline-block",
                width: "2px",
                height: "14px",
                background: "#00d4ff",
                marginLeft: "1px",
                verticalAlign: "text-bottom",
                borderRadius: "1px",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GRID DASHBOARD DATA ─────────────────────────────────────────────────────
const GRID_ITEMS = [
  { city: "Tokyo",           type: "Solar",   pct: 87, color: "#f59e0b" },
  { city: "Berlin",          type: "Wind",    pct: 92, color: "#34d399" },
  { city: "New York",        type: "Hybrid",  pct: 74, color: "#818cf8" },
  { city: "Singapore",       type: "Nuclear", pct: 98, color: "#f472b6" },
  { city: "São Paulo",       type: "Hydro",   pct: 83, color: "#38bdf8" },
  { city: "Mumbai",          type: "Solar",   pct: 91, color: "#f59e0b" },
  { city: "London",          type: "Wind",    pct: 88, color: "#34d399" },
  { city: "Dubai",           type: "Solar",   pct: 95, color: "#f59e0b" },
  { city: "Sydney",          type: "Hybrid",  pct: 79, color: "#818cf8" },
  { city: "Smart Grid Hub 2026", type: "AI Grid", pct: 99, color: "#00d4ff" },
  { city: "Shanghai",        type: "Nuclear", pct: 93, color: "#f472b6" },
  { city: "Paris",           type: "Wind",    pct: 86, color: "#34d399" },
];
const TARGET_IDX = 9; // Smart Grid Hub 2026

// ─── SCENE 6: DIMMING + DARK MODE TOGGLE ─────────────────────────────────────
function DimmingScene({ frame, fps }: { frame: number; fps: number }) {
  const sf = localFrame(frame, S6_START);

  const fadeIn = interpolate(sf, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // "Dimming..." badge — slide-up + fade-in immediately
  const dimmingPop = spring({ fps, frame: sf, config: SPRING_SNAPPY });
  const dimmingY = interpolate(dimmingPop, [0, 1], [28, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Right panel appears at sf=10
  const panelPop = spring({ fps, frame: Math.max(0, sf - 10), config: SPRING_SNAPPY });
  const panelY   = interpolate(panelPop, [0, 1], [40, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Toggle fires at sf=28 (~0.93 s in)
  const toggleAge  = Math.max(0, sf - 28);
  const thumbSpring = spring({ fps, frame: toggleAge, config: SPRING_SNAPPY });
  // Overshoot spring: momentarily overshoots past 1 for elastic thumb snap
  const thumbX = interpolate(thumbSpring, [0, 1], [4, 30]);
  const trackLit = Math.min(1, thumbSpring);

  // Brightness dim overlay — increases as toggle turns ON
  const dimOverlay = interpolate(thumbSpring, [0, 1], [0, 0.32], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // "Optimizing..." appears at sf=40
  const optPop = spring({ fps, frame: Math.max(0, sf - 40), config: SPRING_SNAPPY });
  const optY   = interpolate(optPop, [0, 1], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const optOpacity = Math.min(1, optPop * 1.4);

  // "Eco-Mode" sidebar slides in from left at sf=48
  const ecoSpring = spring({ fps, frame: Math.max(0, sf - 48), config: SPRING_SNAPPY });
  const ecoX      = interpolate(ecoSpring, [0, 1], [-220, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ecoOpacity = Math.min(1, ecoSpring * 1.4);

  const trackBg = `rgba(${Math.round(interpolate(trackLit,[0,1],[80,0]))},${Math.round(interpolate(trackLit,[0,1],[80,212]))},${Math.round(interpolate(trackLit,[0,1],[80,255]))},0.85)`;

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {/* Brightness dim overlay */}
      <AbsoluteFill style={{ background: `rgba(0,0,0,${dimOverlay})`, pointerEvents: "none" }} />

      {/* "Dimming..." status badge — top center */}
      <div style={{
        position: "absolute", top: "22%", left: "50%",
        transform: `translateX(-50%) translateY(${dimmingY}px)`,
        opacity: Math.min(1, dimmingPop * 1.4),
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: "999px",
          padding: "10px 22px",
          fontFamily: "system-ui, sans-serif", fontSize: "16px",
          color: "rgba(255,255,255,0.9)", fontWeight: 500,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%",
            background: "#facc15", display: "inline-block",
            boxShadow: "0 0 8px #facc15" }} />
          Dimming...
        </div>
      </div>

      {/* Right-side control panel */}
      <div style={{
        position: "absolute", top: "50%", right: "8%",
        transform: `translateY(calc(-50% + ${panelY}px))`,
        opacity: Math.min(1, panelPop * 1.4),
        width: 220,
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.10)", borderRadius: "16px",
          padding: "20px 22px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.1em", textTransform: "uppercase",
            fontFamily: "system-ui, sans-serif", marginBottom: "16px" }}>
            Display Settings
          </div>

          {/* Dark Mode row */}
          <div style={{ display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: "18px" }}>
            <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "14px",
              color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>Dark Mode</span>
            {/* Toggle pill */}
            <div style={{ position: "relative", width: 58, height: 30,
              borderRadius: 15, background: trackBg,
              boxShadow: trackLit > 0.5 ? "0 0 12px rgba(0,212,255,0.5)" : "none",
            }}>
              <div style={{
                position: "absolute", top: 3, left: thumbX,
                width: 24, height: 24, borderRadius: 12,
                background: "white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }} />
            </div>
          </div>

          {/* Brightness slider (static decoration) */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)",
              fontFamily: "system-ui, sans-serif" }}>☀</span>
            <div style={{ flex: 1, height: 4, borderRadius: 2,
              background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
              <div style={{ width: `${(1 - dimOverlay / 0.32) * 70 + 10}%`,
                height: "100%", background: "rgba(0,212,255,0.7)",
                borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)",
              fontFamily: "system-ui, sans-serif" }}>☽</span>
          </div>
        </div>
      </div>

      {/* "Optimizing..." badge */}
      <div style={{
        position: "absolute", top: "34%", left: "50%",
        transform: `translateX(-50%) translateY(${optY}px)`,
        opacity: optOpacity,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(0,212,255,0.12)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(0,212,255,0.25)", borderRadius: "999px",
          padding: "10px 22px",
          fontFamily: "system-ui, sans-serif", fontSize: "16px",
          color: "#00d4ff", fontWeight: 500,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%",
            background: "#00d4ff", display: "inline-block",
            boxShadow: "0 0 10px #00d4ff" }} />
          Optimizing...
        </div>
      </div>

      {/* Eco-Mode sidebar */}
      <div style={{
        position: "absolute", top: "50%", left: 0,
        transform: `translateY(-50%) translateX(${ecoX}px)`,
        opacity: ecoOpacity,
      }}>
        <div style={{
          background: "rgba(0,212,255,0.08)", backdropFilter: "blur(12px)",
          borderRight: "1px solid rgba(0,212,255,0.2)", borderRadius: "0 16px 16px 0",
          padding: "24px 20px", width: 190,
        }}>
          <div style={{ fontSize: "11px", color: "rgba(0,212,255,0.6)",
            letterSpacing: "0.1em", textTransform: "uppercase",
            fontFamily: "system-ui, sans-serif", marginBottom: "12px" }}>
            Mode
          </div>
          {["Standard", "Balanced", "Eco-Mode"].map((label, i) => (
            <div key={i} style={{
              padding: "9px 14px", borderRadius: "10px", marginBottom: "6px",
              background: label === "Eco-Mode"
                ? "rgba(0,212,255,0.18)" : "rgba(255,255,255,0.04)",
              border: label === "Eco-Mode"
                ? "1px solid rgba(0,212,255,0.4)" : "1px solid transparent",
              fontFamily: "system-ui, sans-serif",
              fontSize: "13px",
              color: label === "Eco-Mode"
                ? "#00d4ff" : "rgba(255,255,255,0.55)",
              fontWeight: label === "Eco-Mode" ? 600 : 400,
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              {label === "Eco-Mode" && (
                <span style={{ fontSize: "14px" }}>🌿</span>
              )}
              {label}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 7: GRID GALLERY ZOOM-OUT ──────────────────────────────────────────
function GridGalleryScene({ frame, fps }: { frame: number; fps: number }) {
  const sf = localFrame(frame, S7_START);

  const fadeIn = interpolate(sf, [0, 10], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Huge zoom-out: start at scale 2.8, ease to 1
  const zoomOut = interpolate(sf, [0, 50], [2.8, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Title fade-in
  const titleOpacity = interpolate(sf, [12, 30], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: "6%", left: "50%",
        transform: "translateX(-50%)", opacity: titleOpacity,
        fontFamily: "system-ui, sans-serif", fontSize: "13px",
        color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}>
        Energy Grid Gallery — Global Overview
      </div>

      {/* Zoom-out grid container */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${zoomOut})`,
        transformOrigin: "center center",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 230px)",
          gridTemplateRows: "repeat(3, 120px)",
          gap: "14px",
          padding: "10px",
        }}>
          {GRID_ITEMS.map((item, i) => {
            const cardDelay = Math.max(0, sf - (i * 4 + 8));
            const cardPop   = spring({ fps, frame: cardDelay, config: SPRING_SNAPPY });
            const cardScale = Math.min(cardPop, 1.06);

            return (
              <div key={i} style={{
                transform: `scale(${cardScale})`,
                background: i === TARGET_IDX
                  ? "rgba(0,212,255,0.12)"
                  : "rgba(255,255,255,0.04)",
                backdropFilter: "blur(8px)",
                border: `1px solid ${i === TARGET_IDX
                  ? "rgba(0,212,255,0.4)"
                  : "rgba(255,255,255,0.08)"}`,
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex", flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: i === TARGET_IDX
                  ? "0 0 20px rgba(0,212,255,0.15)"
                  : "none",
              }}>
                <div>
                  <div style={{
                    fontFamily: "system-ui, sans-serif", fontSize: "11px",
                    color: i === TARGET_IDX
                      ? "#00d4ff" : "rgba(255,255,255,0.75)",
                    fontWeight: 600, marginBottom: "3px",
                    whiteSpace: "nowrap", overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>{item.city}</div>
                  <div style={{
                    fontFamily: "system-ui, sans-serif", fontSize: "10px",
                    color: "rgba(255,255,255,0.35)",
                  }}>{item.type}</div>
                </div>
                {/* Mini bar */}
                <div style={{ height: 5, borderRadius: 3,
                  background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{
                    width: `${item.pct}%`, height: "100%",
                    background: item.color, borderRadius: 3,
                  }} />
                </div>
                <div style={{
                  fontFamily: "system-ui, sans-serif", fontSize: "16px",
                  fontWeight: 700, color: "rgba(255,255,255,0.9)",
                }}>{item.pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 8: PROJECT FOCUS ZOOM-IN ──────────────────────────────────────────
function ProjectFocusScene({ frame, fps }: { frame: number; fps: number }) {
  const sf = localFrame(frame, S8_START);

  const fadeIn = interpolate(sf, [0, 8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Card enters with Ease In + Overshoot spring
  const cardSpring = spring({ fps, frame: sf, config: SPRING_SNAPPY });
  const cardScale  = interpolate(cardSpring, [0, 1], [0.45, 1]);
  const cardOpacity = Math.min(1, cardSpring * 1.2);

  const bars = [
    { label: "Solar",    pct: 94, color: "#f59e0b" },
    { label: "Wind",     pct: 87, color: "#34d399" },
    { label: "AI Grid",  pct: 99, color: "#00d4ff" },
    { label: "Storage",  pct: 78, color: "#818cf8" },
  ];

  return (
    <AbsoluteFill style={{ opacity: fadeIn, display: "flex",
      alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${cardScale})`, opacity: cardOpacity }}>
        <div style={{
          width: 560, background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(0,212,255,0.25)",
          borderRadius: "20px", padding: "32px 36px",
          boxShadow: "0 0 60px rgba(0,212,255,0.12), 0 16px 60px rgba(0,0,0,0.5)",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center",
            gap: "12px", marginBottom: "28px" }}>
            <span style={{ fontSize: "26px" }}>⚡</span>
            <div>
              <div style={{ fontFamily: "system-ui, sans-serif",
                fontSize: "20px", fontWeight: 700,
                color: "white", letterSpacing: "-0.01em" }}>
                Smart Grid Hub 2026
              </div>
              <div style={{ fontFamily: "system-ui, sans-serif",
                fontSize: "12px", color: "rgba(0,212,255,0.7)",
                marginTop: "2px" }}>
                Power Distribution · AI Grid
              </div>
            </div>
            <div style={{ marginLeft: "auto",
              background: "rgba(0,212,255,0.15)",
              border: "1px solid rgba(0,212,255,0.35)",
              borderRadius: "999px", padding: "4px 12px",
              fontFamily: "system-ui, sans-serif", fontSize: "12px",
              color: "#00d4ff", fontWeight: 600 }}>
              99% ↑
            </div>
          </div>

          {/* Distribution bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {bars.map((b, i) => {
              const delayedFill = interpolate(
                Math.max(0, sf - (20 + i * 6)), [0, 30], [0, 1],
                { easing: Easing.out(Easing.cubic),
                  extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    marginBottom: "6px" }}>
                    <span style={{ fontFamily: "system-ui, sans-serif",
                      fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                      {b.label}
                    </span>
                    <span style={{ fontFamily: "system-ui, sans-serif",
                      fontSize: "13px", color: b.color, fontWeight: 600 }}>
                      {b.pct}%
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4,
                    background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{
                      width: `${b.pct * delayedFill}%`, height: "100%",
                      background: `linear-gradient(90deg, ${b.color}99, ${b.color})`,
                      borderRadius: 4,
                      boxShadow: `0 0 8px ${b.color}66`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 9: COMMENT + TYPEWRITER ───────────────────────────────────────────
const COMMENT_TEXT = "Switch to renewable-first distribution";

function CommentScene({ frame, fps }: { frame: number; fps: number }) {
  const sf = localFrame(frame, S9_START);

  const fadeIn = interpolate(sf, [0, 8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Project card stays, slightly smaller
  const cardOpacity = interpolate(sf, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Comment button pops in at sf=5
  const btnPop     = spring({ fps, frame: Math.max(0, sf - 5), config: SPRING_SNAPPY });
  const btnScale   = Math.min(btnPop, 1.06);
  const btnOpacity = Math.min(1, btnPop * 1.4);

  // Button click at sf=18 → scale-down then spring back
  const clickAge     = Math.max(0, sf - 18);
  const clickRebound = spring({ fps, frame: clickAge, config: SPRING_CLICK });
  const clickScale   = sf >= 18 ? 0.92 + 0.08 * Math.min(1, clickRebound) : 1;

  // Input box slides up at sf=22
  const inputPop = spring({ fps, frame: Math.max(0, sf - 22), config: SPRING_SNAPPY });
  const inputY   = interpolate(inputPop, [0, 1], [50, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const inputOpacity = Math.min(1, inputPop * 1.4);

  // Typewriter starts at sf=26 at 28 chars/sec
  const TYPING_SPEED = 28;
  const typingFrames = fps / TYPING_SPEED;
  const charsToShow  = Math.min(
    COMMENT_TEXT.length,
    Math.floor(Math.max(0, sf - 26) / typingFrames) + 1
  );
  const typed = COMMENT_TEXT.slice(0, charsToShow);
  const cursorOn = sf % 16 < 9;

  // Data flow pulses after typing ends (~sf=52)
  const flowOpacity = interpolate(sf, [52, 58], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const flowOffset  = -(sf * 2.5);

  return (
    <AbsoluteFill style={{ opacity: fadeIn,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "20px" }}>

      {/* Project card mini-preview at top */}
      <div style={{ opacity: cardOpacity }}>
        <div style={{
          width: 480, background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: "16px", padding: "18px 22px",
          boxShadow: "0 0 30px rgba(0,212,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center",
            justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>⚡</span>
              <div style={{ fontFamily: "system-ui, sans-serif",
                fontSize: "16px", fontWeight: 700, color: "white" }}>
                Smart Grid Hub 2026
              </div>
            </div>
            {/* Comment button */}
            <div style={{
              transform: `scale(${btnScale * clickScale})`,
              opacity: btnOpacity,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "7px",
                background: "rgba(0,212,255,0.14)",
                border: "1px solid rgba(0,212,255,0.3)",
                borderRadius: "999px", padding: "7px 16px",
                fontFamily: "system-ui, sans-serif", fontSize: "13px",
                color: "#00d4ff", fontWeight: 500, cursor: "pointer",
              }}>
                💬 Comment
              </div>
            </div>
          </div>

          {/* Mini bar decoration */}
          <div style={{ display: "flex", gap: "6px", marginTop: "14px" }}>
            {[94, 87, 99, 78].map((v, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2,
                background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${v}%`, height: "100%", borderRadius: 2,
                  background: ["#f59e0b","#34d399","#00d4ff","#818cf8"][i] }} />
              </div>
            ))}
          </div>

          {/* Data flow SVG — activates after typing */}
          <svg width="100%" height="28" style={{ marginTop: "10px", opacity: flowOpacity }}>
            {[0, 1, 2].map((row) => (
              <path
                key={row}
                d={`M 0 ${8 + row * 8} Q 120 ${4 + row * 8} 240 ${8 + row * 8} Q 360 ${12 + row * 8} 480 ${8 + row * 8}`}
                fill="none"
                stroke={row === 2 ? "#00d4ff" : "rgba(0,212,255,0.3)"}
                strokeWidth={row === 2 ? 1.5 : 1}
                strokeDasharray="12 8"
                strokeDashoffset={flowOffset + row * 20}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Frosted glass comment input */}
      <div style={{
        width: 480,
        transform: `translateY(${inputY}px)`,
        opacity: inputOpacity,
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "14px", padding: "16px 20px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.08em", textTransform: "uppercase",
            marginBottom: "8px" }}>
            Comment
          </div>
          <div style={{
            color: "rgba(255,255,255,0.88)",
            fontFamily: "'SF Mono','Fira Code','Courier New',monospace",
            fontSize: "14px", lineHeight: "1.6", minHeight: "22px",
          }}>
            {typed.split("").map((ch, i) => {
              const charFrame = S9_START + 26 + i * typingFrames;
              const age = Math.max(0, frame - charFrame);
              return (
                <span key={i} style={{ opacity: Math.min(1, age / 4) }}>{ch}</span>
              );
            })}
            {charsToShow < COMMENT_TEXT.length && cursorOn && (
              <span style={{ display: "inline-block", width: 2, height: 13,
                background: "#00d4ff", marginLeft: 1,
                verticalAlign: "text-bottom", borderRadius: 1 }} />
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── MAIN COMPOSITION ────────────────────────────────────────────────────────
export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Scene 1: Energy Saving button ─────────────────────────────────────────
  const s1 = localFrame(frame, S1_START);

  const btnPopup = spring({ fps, frame: s1, config: SPRING_SNAPPY });

  // Simulated click at frame 42
  const clickAge    = localFrame(frame, 42);
  const clickRebound = spring({ fps, frame: clickAge, config: SPRING_CLICK });
  const clickScale  = frame >= 42 ? 0.95 + 0.05 * Math.min(1, clickRebound) : 1;
  const btnScale    = Math.min(btnPopup, 1.08) * clickScale;

  const btnOpacity = interpolate(frame, [S1_END - 12, S1_END], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Scene 2: Window entrance ──────────────────────────────────────────────
  const s2 = localFrame(frame, S2_START);
  const windowSpring = spring({ fps, frame: s2, config: SPRING_SNAPPY });

  // ── Scene 4: Globe ────────────────────────────────────────────────────────
  const s4 = localFrame(frame, S4_START);

  // ── Scene 5: Iris wipe ────────────────────────────────────────────────────
  const s5 = localFrame(frame, S5_START);

  // Circle expands from 0 → 820 (beyond corner distance ~734)
  const irisRadius = interpolate(s5, [0, 38], [0, 820], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline springs in after iris is ~60% open
  const taglineSpring = spring({
    fps,
    frame: Math.max(0, s5 - 28),
    config: SPRING_SNAPPY,
  });
  const taglineY = interpolate(taglineSpring, [0, 1], [70, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineOpacity = Math.min(1, taglineSpring * 1.3);

  const urlOpacity = interpolate(s5, [65, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Last second fade-to-black
  const finalFade = interpolate(s5, [90, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Visibility guards ─────────────────────────────────────────────────────
  const showBtn   = frame < S2_START;
  const showWin   = frame >= S2_START && frame < S5_START;
  const showGlobe = frame >= S4_START && frame < S5_START + 42;
  const showS5    = frame >= S5_START && frame < S6_START;
  const showS6    = frame >= S6_START && frame < S7_START;
  const showS7    = frame >= S7_START && frame < S8_START;
  const showS8    = frame >= S8_START && frame < S9_START;
  const showS9    = frame >= S9_START;

  return (
    <AbsoluteFill>

      {/* Dark tech gradient (always behind everything) */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(140deg, #001333 0%, #08001a 55%, #000000 100%)",
        }}
      />

      {/* Subtle centre glow for S1 tech feel */}
      {frame < S2_START && (
        <AbsoluteFill style={{
          background: "radial-gradient(ellipse at 50% 52%, rgba(0,80,160,0.18) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
      )}

      {/* ─────────────── SCENE 1: Energy Saving Button ─────────────────────── */}
      {showBtn && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: btnOpacity,
          }}
        >
          <div style={{ transform: `scale(${btnScale})` }}>
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                color: "white",
                padding: "16px 36px",
                borderRadius: "999px",
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: "19px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow:
                  "0 0 32px rgba(0,212,255,0.22), 0 6px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)",
                border: "1px solid rgba(0,212,255,0.38)",
                backdropFilter: "blur(14px)",
                letterSpacing: "0.01em",
              }}
            >
              <span style={{ fontSize: "24px" }}>🎨</span>
              Energy Saving
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ─────────────── SCENES 2–4: Input Window ──────────────────────────── */}
      {showWin && (
        <InputWindow
          windowSpring={windowSpring}
          frame={frame}
          showTextA={frame >= S3_START}
          showTextB={frame >= S4_START}
          fps={fps}
          charsPerSecA={CHARS_PER_SEC_A}
          charsPerSecB={CHARS_PER_SEC_B}
        />
      )}

      {/* ─────────────── SCENE 4: Rotating Globe ───────────────────────────── */}
      {showGlobe && <GlobeSVG s4Frame={s4} fps={fps} />}

      {/* ─────────────── SCENE 5: Iris Wipe + CTA ──────────────────────────── */}
      {showS5 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `circle(${irisRadius}px at 50% 50%)`,
            opacity: finalFade,
          }}
        >
          {/* Scene 5 background */}
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, #0a1628 0%, #000000 80%)",
            }}
          />

          {/* Subtle hi-tech grid */}
          <AbsoluteFill
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), " +
                "linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* Tagline */}
          <AbsoluteFill
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                transform: `translateY(${taglineY}px)`,
                opacity: taglineOpacity,
                textAlign: "center",
                padding: "0 60px",
              }}
            >
              <div
                style={{
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: "56px",
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.1,
                  textShadow:
                    "0 0 60px rgba(0,200,255,0.3), 0 2px 10px rgba(0,0,0,0.6)",
                }}
              >
                Powering a Greener Future.
              </div>
            </div>
          </AbsoluteFill>

          {/* URL */}
          <div
            style={{
              position: "absolute",
              bottom: "58px",
              width: "100%",
              textAlign: "center",
              opacity: urlOpacity,
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "20px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.08em",
            }}
          >
            asus.com
          </div>
        </div>
      )}
      {/* ─────────────── 分鏡1: Dimming + Dark Mode ────────────────────────── */}
      {showS6 && <DimmingScene frame={frame} fps={fps} />}

      {/* ─────────────── 分鏡2: Grid Gallery Zoom-out ───────────────────────── */}
      {showS7 && <GridGalleryScene frame={frame} fps={fps} />}

      {/* ─────────────── 分鏡3: Project Focus Zoom-in ───────────────────────── */}
      {showS8 && <ProjectFocusScene frame={frame} fps={fps} />}

      {/* ─────────────── 分鏡4: Comment + Typewriter ────────────────────────── */}
      {showS9 && <CommentScene frame={frame} fps={fps} />}

    </AbsoluteFill>
  );
};
