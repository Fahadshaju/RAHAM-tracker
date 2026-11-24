import { useState } from "react";
import { HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { confirmDonation, createDonation } from "@/lib/donate.functions";

declare global {
  interface Window { Razorpay?: new (o: Record<string, unknown>) => { open(): void; on(e: string, f: (r: { error: { description: string } }) => void): void } }
}

function loadCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window."));
    document.body.appendChild(s);
  });
}

export function DonateBox() {
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createDonation);
  const confirm = useServerFn(confirmDonation);

  async function check(orderId: string) {
    const { paid } = await confirm({ data: { orderId } });
    if (paid) toast.success("JazakAllah khair — your support was received.");
  }

  async function give() {
    const rupees = Math.floor(Number(amount));
    if (!rupees || rupees < 10 || rupees > 100000) { toast.error("Enter an amount between ₹10 and ₹1,00,000."); return; }
    setBusy(true);
    try {
      await loadCheckout();
      const o = await create({ data: { rupees } });
      const rzp = new window.Razorpay!({
        key: o.keyId, order_id: o.orderId, amount: o.amount, currency: "INR",
        name: "RAHAM", description: "Support a non-funded organization",
        theme: { color: "#7c3aed" },
        handler: () => check(o.orderId),
        modal: { ondismiss: () => check(o.orderId) },
      });
      rzp.on("payment.failed", (r) => toast.error(r.error.description));
      rzp.open();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The payment could not be started.");
    } finally { setBusy(false); }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" title="Support a cause" aria-label="Support a cause">
          <HeartHandshake size={15} className="text-violet-soft" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="text-sm font-medium">Support a non-funded organization</p>
        <p className="text-[11px] text-muted-foreground mb-3">Pay what you wish.</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">₹</span>
          <input aria-label="Amount in rupees" inputMode="numeric" value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm" />
          <Button size="sm" onClick={give} disabled={busy}>{busy ? "Opening…" : "Give"}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
