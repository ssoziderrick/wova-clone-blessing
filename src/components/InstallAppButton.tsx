import { useEffect, useState } from "react";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton({ className }: { className?: string }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(!!standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <p className={"text-center text-xs text-muted-foreground " + (className ?? "")}>
        Car Bond Manager is installed on this device.
      </p>
    );
  }

  async function install() {
    if (!promptEvent) {
      setShowHelp(true);
      return;
    }
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  return (
    <div className={className}>
      <Button
        onClick={install}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        <Download className="mr-2 h-4 w-4" /> Install Car Bond Manager
      </Button>
      {showHelp && (
        <div className="mt-2 flex gap-2 rounded-md border border-input bg-background/60 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p>
              <b>Windows / Desktop (Chrome or Edge):</b> click the install icon in the address bar,
              or open the browser menu (⋮ / …) → <b>Install Car Bond Manager</b>. Then right-click
              the app icon → <b>Pin to taskbar</b>.
            </p>
            <p>
              <b>Android (Chrome):</b> menu (⋮) → <b>Add to Home screen</b> / <b>Install app</b>.
            </p>
            <p>
              <b>iPhone / iPad (Safari):</b> Share button → <b>Add to Home Screen</b>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
