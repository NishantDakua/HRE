import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Role } from "./types";

const KEY = "spare.mode";

async function readMode(): Promise<string | null> {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}

async function writeMode(value: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(KEY, value);
    return;
  }
  await SecureStore.setItemAsync(KEY, value);
}

interface ModeValue {
  mode: Role;
  ready: boolean;
  setMode: (mode: Role) => void;
}

const ModeContext = createContext<ModeValue>({
  mode: "seeker",
  ready: false,
  setMode: () => undefined,
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Role>("seeker");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readMode()
      .then((stored) => {
        if (stored === "provider" || stored === "seeker") setModeState(stored);
      })
      .finally(() => setReady(true));
  }, []);

  const setMode = (next: Role) => {
    setModeState(next);
    void writeMode(next);
  };

  return <ModeContext.Provider value={{ mode, ready, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeValue {
  return useContext(ModeContext);
}
