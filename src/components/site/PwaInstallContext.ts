import { createContext, useContext } from "react";

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaInstallContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

export const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function usePwaInstall() {
  const value = useContext(PwaInstallContext);
  if (!value) throw new Error("usePwaInstall must be used within PwaInstallProvider.");
  return value;
}
