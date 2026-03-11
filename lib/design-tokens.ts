/**
 * Design Token System
 * Based on mystory-app.jsx design tokens
 * Color palette: Warm brown (luxury minimal tone)
 * Typography: Noto Serif KR (serif), system fonts (sans)
 */

export const TOKENS = {
  // Colors
  bg: "#FAFAF8",
  warm: "#F5F2ED",
  dark: "#1A1816",
  card: "#FFF",
  text: "#1A1816",
  subtext: "#6B6560",
  muted: "#78716C",
  light: "#D6D3D1",
  accent: "#8B5E34",
  accentBg: "#FBF7F2",
  accentBorder: "#E8D5BF",
  border: "#E7E5E0",
  borderLight: "#F0EEEA",

  // Typography
  serif: "'Noto Serif KR', Georgia, serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

  // Shadows
  shadowSm: "0 1px 3px rgba(0,0,0,.04)",
  shadowLg: "0 4px 20px rgba(0,0,0,.06)",

  // Border Radius
  radius: 8,
  radiusSm: 6,

  // Font Sizes
  fontSize: {
    xs: 10,
    sm: 11,
    base: 14,
    lg: 15,
    xl: 16,
    "2xl": 17,
    "3xl": 18,
    "4xl": 20,
  },

  // Responsive Typography (using clamp)
  // e.g., clamp(min, preferred, max)
  h1: "clamp(2rem, 7vw, 2.6rem)",
  h2: "clamp(1.1rem, 4.5vw, 1.3rem)",
} as const;

export type FontSizePreset = "normal" | "large";

export const FONT_SIZE_PRESETS: Record<
  FontSizePreset,
  {
    label: string;
    body: number;
    chat: number;
    prose: number;
    input: number;
    book: number;
    lineHeight: number;
  }
> = {
  normal: {
    label: "일반",
    body: 16,
    chat: 16,
    prose: 17,
    input: 16,
    book: 17,
    lineHeight: 2.0,
  },
  large: {
    label: "확대",
    body: 19,
    chat: 19,
    prose: 20,
    input: 18,
    book: 20,
    lineHeight: 2.2,
  },
};

export const STT_MODES = {
  browser: {
    label: "브라우저 음성인식",
    desc: "무료, Chrome/Safari 내장",
  },
  whisper: {
    label: "Whisper AI",
    desc: "고정밀, API 연동 필요",
  },
  off: {
    label: "사용 안 함",
    desc: "녹음 버튼 숨김",
  },
} as const;

export type STTMode = keyof typeof STT_MODES;
