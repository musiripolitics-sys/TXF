"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toast";
import { type Tier } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function MembershipTiers({ tiers }: { tiers: Tier[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
  }, [supabase]);

  const handleSubscribe = async (tierName: string) => {
    // 1. Check if user is logged in
    if (!user) {
      router.push(`/login?mode=signup&next=/membership`);
      return;
    }

    if (tierName === "Free Member") {
      router.push("/login?mode=signup&next=/events");
      return;
    }

    setLoadingPlan(tierName);

    try {
      const tierKey = tierName.split(" ")[0]; // "Pro" or "Elite"

      // 2. Call local API route to create Razorpay Order
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierKey }),
      });

      const orderData = await res.json();
      if (!res.ok || orderData.error) {
        toast(orderData.error || "Failed to initiate payment.", "error");
        setLoadingPlan(null);
        return;
      }

      const { orderId, amount, currency, keyId } = orderData;

      // 3. Configure Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: "Techxfluence",
        description: `${tierName} Plan Subscription`,
        order_id: orderId,
        handler: async (response: any) => {
          setLoadingPlan(tierName);
          try {
            // 4. Verify payment signature on the server
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                tier: tierKey,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              toast(`Subscribed to ${tierName} 🎉`, "success");
              router.push("/events");
              router.refresh();
            } else {
              toast(verifyData.error || "Payment verification failed.", "error");
            }
          } catch (err) {
            console.error("Verification request failed:", err);
            toast("Connection error during verification.", "error");
          } finally {
            setLoadingPlan(null);
          }
        },
        prefill: {
          name: user.user_metadata?.full_name || "",
          email: user.email || "",
        },
        theme: {
          color: "#ff5a1f", // Brand orange accent
        },
        modal: {
          ondismiss: () => {
            setLoadingPlan(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Initiate checkout failed:", err);
      toast("Failed to connect to the payment gateway.", "error");
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => {
          const isProcessing = loadingPlan === tier.name;
          return (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-3xl border p-7 ${
                tier.highlight
                  ? "border-brand bg-surface shadow-[0_20px_60px_-20px_rgba(255,106,26,0.45)]"
                  : "border-line bg-surface"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h2 className="font-display text-lg font-semibold text-fg">
                {tier.name}
              </h2>
              <p className="mt-1 text-sm text-muted">{tier.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-fg">
                  {tier.price}
                </span>
                <span className="text-sm text-faint">/ {tier.cadence}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2.5 text-sm text-muted"
                  >
                    <Icon
                      name="check"
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        tier.highlight ? "text-brand" : "text-host"
                      }`}
                      strokeWidth={2.2}
                    />
                    {perk}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.name)}
                disabled={isProcessing}
                className={`mt-7 w-full cursor-pointer rounded-full py-3.5 text-center text-sm font-semibold transition-all duration-200 ${
                  tier.highlight
                    ? "bg-brand text-white shadow-[0_8px_30px_-8px_rgba(255,106,26,0.7)] hover:bg-brand-soft hover:-translate-y-0.5"
                    : "border border-line bg-surface text-fg hover:border-brand hover:text-brand"
                } disabled:opacity-50 disabled:hover:translate-y-0`}
              >
                {isProcessing ? "Processing…" : tier.cta}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
