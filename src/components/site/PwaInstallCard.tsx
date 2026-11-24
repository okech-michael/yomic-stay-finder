import { useState } from "react";
import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { usePwaInstall } from "@/components/site/PwaInstallContext";

export function PwaInstallCard() {
  const { canInstall, isInstalled, install } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState("");

  async function installApp() {
    setInstalling(true);
    setInstallMessage("");
    try {
      const outcome = await install();
      if (outcome === "accepted") {
        setInstallMessage("Yomic Stays was added to your device.");
      } else if (outcome === "dismissed") {
        setInstallMessage("Installation was cancelled. You can install it later.");
      } else {
        setInstallMessage(
          "To install, open your browser menu and choose Install app or Add to Home Screen.",
        );
      }
    } catch (error) {
      setInstallMessage(
        error instanceof Error ? error.message : "The app could not be installed right now.",
      );
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section className="rounded-3xl bg-card p-6 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          {isInstalled ? <CheckCircle2 className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold">Yomic Stays on your device</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep your bookings and account one tap away. Your personal information stays private to
            your account.
          </p>
          {isInstalled ? (
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> App installed
            </p>
          ) : (
            <button
              type="button"
              onClick={installApp}
              disabled={installing}
              className="mt-4 inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {installing ? "Opening install…" : canInstall ? "Install app" : "How to install"}
            </button>
          )}
          {installMessage && (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              {installMessage}
            </p>
          )}
          {!isInstalled && !canInstall && (
            <p className="mt-2 text-xs text-muted-foreground">
              On iPhone or iPad, tap Share, then Add to Home Screen.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
