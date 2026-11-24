import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PwaInstallContext, type InstallPromptEvent } from "@/components/site/PwaInstallContext";

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Could not register the Yomic Stays service worker.", error);
      });
    }

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const updateInstalledState = () => {
      const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
      setIsInstalled(standaloneQuery.matches || standaloneNavigator.standalone === true);
    };
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    updateInstalledState();
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    standaloneQuery.addEventListener("change", updateInstalledState);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standaloneQuery.removeEventListener("change", updateInstalledState);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return "unavailable";
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") setIsInstalled(true);
    return choice.outcome;
  }, [installPrompt]);

  const value = useMemo(
    () => ({ canInstall: installPrompt !== null, isInstalled, install }),
    [installPrompt, isInstalled, install],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}
