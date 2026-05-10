"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useState } from "react";
import { Check } from "lucide-react";

interface Props {
  planId: string;
  planName: string;
}

export function PayPalSubscribeButton({ planId, planName }: Props) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

  if (!clientId || clientId === "YOUR_PAYPAL_CLIENT_ID_HERE") {
    return (
      <div className="text-xs text-muted-foreground text-center py-2 border rounded-lg">
        PayPal not configured yet
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg py-3 font-medium">
        <Check size={15} />
        Subscribed! Check your email.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
      <PayPalScriptProvider
        options={{
          clientId,
          vault: true,
          intent: "subscription",
        }}
      >
        <PayPalButtons
          style={{ layout: "vertical", shape: "rect", color: "blue", label: "subscribe", height: 36 }}
          createSubscription={(_data, actions) =>
            actions.subscription.create({ plan_id: planId })
          }
          onApprove={async (data) => {
            console.log(`${planName} subscription approved:`, data.subscriptionID);
            setSuccess(true);
          }}
          onError={(err) => {
            console.error("PayPal error:", err);
            setError("Payment failed. Please try again.");
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}
