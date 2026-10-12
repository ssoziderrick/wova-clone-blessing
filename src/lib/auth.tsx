import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSetting, setSetting } from "./db";

interface AuthCtx {
  hasPin: boolean | null;
  unlocked: boolean;
  setPin: (pin: string, accessor?: string) => Promise<void>;
  verifyPin: (pin: string, accessor?: string) => Promise<boolean>;
  lock: () => void;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  resetPin: (ownerName: string) => Promise<boolean>;
  lastAccess: { name: string; at: string } | null;

}

const Ctx = createContext<AuthCtx | null>(null);
const INACTIVITY_MS = 3 * 60 * 1000;

async function hash(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + ":carbond-salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [lastAccess, setLastAccess] = useState<{ name: string; at: string } | null>(null);

  useEffect(() => {
    getSetting("pinHash").then((h) => setHasPin(!!h));
    (async () => {
      const name = await getSetting("lastAccessName");
      const at = await getSetting("lastAccessAt");
      if (name && at) setLastAccess({ name, at });
    })();
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setUnlocked(false), INACTIVITY_MS);
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [unlocked]);

  async function recordAccess(accessor?: string) {
    const name = (accessor && accessor.trim()) || (await getSetting("lastAccessName")) || "User";
    const at = new Date().toISOString();
    await setSetting("lastAccessName", name);
    await setSetting("lastAccessAt", at);
    setLastAccess({ name, at });
  }

  const value: AuthCtx = {
    hasPin,
    unlocked,
    lastAccess,
    async setPin(pin, accessor) {
      await setSetting("pinHash", await hash(pin));
      setHasPin(true);
      setUnlocked(true);
      await recordAccess(accessor);
    },
    async verifyPin(pin, accessor) {
      const stored = await getSetting("pinHash");
      const ok = stored === (await hash(pin));
      if (ok) {
        setUnlocked(true);
        await recordAccess(accessor);
      }
      return ok;
    },
    lock() {
      setUnlocked(false);
    },
    async changePin(oldPin, newPin) {
      const stored = await getSetting("pinHash");
      if (stored !== (await hash(oldPin))) return false;
      await setSetting("pinHash", await hash(newPin));
      return true;
    },
    async resetPin(ownerName) {
      const recorded = (await getSetting("lastAccessName")) || "";
      const target = recorded.trim().toLowerCase();
      const given = ownerName.trim().toLowerCase();
      // Require the recorded owner/last-accessor name to match. If no name was
      // ever recorded, accept "owner" as a bootstrap fallback.
      const ok = target ? given === target : given === "owner";
      if (!ok) return false;
      await setSetting("pinHash", "");
      setHasPin(false);
      setUnlocked(false);
      return true;
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}


export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
