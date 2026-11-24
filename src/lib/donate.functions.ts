import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/razorpay";

function env() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["RAZORPAY_CONNECTION_KEY"];
  const keyId = process.env["RAZORPAY_CONNECTION_KEY_ID"];
  if (!lovableKey || !connectionKey || !keyId) throw new Error("Payments are not set up yet.");
  return { lovableKey, connectionKey, keyId };
}

async function razorpay(path: string, body?: unknown) {
  const { lovableKey, connectionKey } = env();
  const res = await fetch(`${GATEWAY_URL}/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Razorpay ${path} failed [${res.status}]: ${text}`);
    throw new Error("The payment could not be started. Please try again.");
  }
  return res.json();
}

/** Donation amount in whole rupees: ₹10 to ₹1,00,000. */
export const createDonation = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ rupees: z.number().int().min(10).max(100000) }).parse(d))
  .handler(async ({ data }) => {
    const order = await razorpay("orders", {
      amount: data.rupees * 100,
      currency: "INR",
      receipt: `don_${Date.now()}`,
      notes: { purpose: "Donation" },
    });
    return { orderId: order.id as string, amount: order.amount as number, keyId: env().keyId };
  });

export const confirmDonation = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ orderId: z.string().regex(/^order_[A-Za-z0-9]+$/) }).parse(d))
  .handler(async ({ data }) => {
    const order = await razorpay(`orders/${data.orderId}`);
    return { paid: order.status === "paid" };
  });
