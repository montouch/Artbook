import { ReactNode, createContext, useContext, useMemo, useState } from "react";

type Mood = "calm" | "hype" | "soulful" | "experimental";

interface VibePalette {
  bg: string;
  text: string;
  accent: string;
}

const moodPalettes: Record<Mood, VibePalette> = {
  calm: { bg: "#F4F9F9", text: "#172121", accent: "#2B7A78" },
  hype: { bg: "#1B1B3A", text: "#F7F7FF", accent: "#FF7F11" },
  soulful: { bg: "#F9F1E6", text: "#32161F", accent: "#A44A3F" },
  experimental: { bg: "#EEF0FF", text: "#1D1A31", accent: "#7A28CB" }
};

const VibeContext = createContext<{
  mood: Mood;
  palette: VibePalette;
  setMood: (mood: Mood) => void;
} | null>(null);

export const VibeProvider = ({ children }: { children: ReactNode }) => {
  const [mood, setMood] = useState<Mood>("calm");
  const value = useMemo(
    () => ({ mood, setMood, palette: moodPalettes[mood] }),
    [mood]
  );
  return <VibeContext.Provider value={value}>{children}</VibeContext.Provider>;
};

export const useVibe = () => {
  const context = useContext(VibeContext);
  if (!context) {
    throw new Error("useVibe must be used inside VibeProvider");
  }
  return context;
};
