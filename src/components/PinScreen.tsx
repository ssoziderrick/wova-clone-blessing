import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Delete } from "lucide-react";
import logo from "@/assets/wova-rich-logo.jpeg.asset.json";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function PinScreen() {
  const { hasPin, setPin, verifyPin, resetPin, lastAccess } = useAuth();
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotName, setForgotName] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotDone, setForgotDone] = useState(false);



  const isCreate = hasPin === false;
  const current = stage === "enter" ? pin : confirm;

  const press = (d: string) => {
    setError("");
    if (current.length >= 4) return;
    const next = current + d;
    if (stage === "enter") setPinValue(next);
    else setConfirm(next);
    if (next.length === 4) handleFull(next);
  };

  const back = () => {
    setError("");
    if (stage === "enter") setPinValue(pin.slice(0, -1));
    else setConfirm(confirm.slice(0, -1));
  };

  async function handleFull(value: string) {
    if (isCreate) {
      if (stage === "enter") {
        setTimeout(() => setStage("confirm"), 150);
        return;
      }
      if (value !== pin) {
        setError("PINs don't match. Try again.");
        setPinValue("");
        setConfirm("");
        setStage("enter");
        return;
      }
      await setPin(value, name || "Owner");
    } else {
      if (!name.trim()) {
        setError("Please enter your name first");
        setPinValue("");
        return;
      }
      const ok = await verifyPin(value, name);
      if (!ok) {
        setError("Incorrect PIN");
        setPinValue("");
      }
    }
  }

  const title = isCreate
    ? stage === "enter"
      ? "Create a 4-digit PIN"
      : "Confirm your PIN"
    : "Enter your PIN";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      {/* Ambient neon backdrop */}
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-app-bg)" }} />
      <div className="absolute -z-10 h-[60vmin] w-[60vmin] rounded-full bg-gradient-primary opacity-30 blur-3xl animate-breath" />

      <div className="glass-panel relative flex w-full max-w-[380px] flex-col items-center p-7">
        <div className="relative mb-4">
          <div className="absolute -inset-2 rounded-full bg-gradient-primary opacity-60 blur-xl animate-breath" />
          <img src={logo.url} alt="Wova Rich Investments" className="relative h-20 w-20 rounded-full object-cover ring-2 ring-white/40 shadow-tile" />
        </div>
        <h1 className="text-3xl font-bold tracking-[0.28em]">WOVA</h1>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Wova Rich Investments LTD</p>
        <p className="mt-3 text-sm text-foreground/80">{title}</p>

        <div className="mt-4 w-full">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isCreate ? "Your name (owner)" : "Your name"}
            className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="my-6 flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-3.5 w-3.5 rounded-full border transition-all ${
                current.length > i
                  ? "border-transparent bg-gradient-teal shadow-[0_0_12px_var(--teal)] scale-110"
                  : "border-white/25 bg-white/5"
              }`}
            />
          ))}
        </div>
        {error && <p className="mb-3 rounded-md bg-destructive/30 px-3 py-1 text-sm text-destructive-foreground ring-1 ring-destructive/60">{error}</p>}

        <div className="grid w-full grid-cols-3 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Button key={n} variant="ghost" onClick={() => press(String(n))}
              className="btn-tactile active:btn-tactile-press h-14 rounded-xl bg-white/5 text-xl font-semibold text-foreground hover:bg-white/10">
              {n}
            </Button>
          ))}
          <div />
          <Button variant="ghost" onClick={() => press("0")}
            className="btn-tactile active:btn-tactile-press h-14 rounded-xl bg-white/5 text-xl font-semibold text-foreground hover:bg-white/10">0</Button>
          <Button variant="ghost" onClick={back}
            className="btn-tactile active:btn-tactile-press h-14 rounded-xl bg-white/5 text-foreground hover:bg-white/10">
            <Delete className="h-5 w-5" />
          </Button>
        </div>

        {lastAccess && !isCreate && (
          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Last accessed by <span className="font-semibold text-foreground">{lastAccess.name}</span><br />
            <span className="font-mono-num">{new Date(lastAccess.at).toLocaleString()}</span>
          </p>
        )}

        {!isCreate && (
          <button
            type="button"
            onClick={() => { setForgotOpen(true); setForgotName(""); setForgotError(""); setForgotDone(false); }}
            className="mt-4 text-xs font-medium text-foreground/70 underline underline-offset-4 hover:text-foreground"
          >
            Forgot PIN?
          </button>
        )}
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="glass-panel border-white/15 sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Reset PIN</DialogTitle>
            <DialogDescription>
              {forgotDone
                ? "PIN cleared. Close this dialog to create a new 4-digit PIN. Your data is preserved."
                : "For security, type the name of the last recorded owner/accessor to reset the PIN."}
            </DialogDescription>
          </DialogHeader>
          {!forgotDone && (
            <div className="space-y-3">
              <Input
                value={forgotName}
                onChange={(e) => setForgotName(e.target.value)}
                placeholder={lastAccess?.name ? `e.g. ${lastAccess.name}` : "Owner name"}
                className="border-white/15 bg-white/5"
              />
              {forgotError && (
                <p className="rounded-md bg-destructive/30 px-3 py-1 text-sm text-destructive-foreground ring-1 ring-destructive/60">
                  {forgotError}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Data on this device is not deleted — only the PIN lock is removed so you can set a new one.
              </p>
            </div>
          )}
          <DialogFooter>
            {forgotDone ? (
              <Button
                onClick={() => {
                  setForgotOpen(false);
                  setPinValue("");
                  setConfirm("");
                  setStage("enter");
                  setError("");
                }}
              >
                Create new PIN
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  const ok = await resetPin(forgotName);
                  if (ok) {
                    setForgotDone(true);
                    setForgotError("");
                  } else {
                    setForgotError("Name doesn't match the last recorded accessor.");
                  }
                }}
              >
                Reset PIN
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
