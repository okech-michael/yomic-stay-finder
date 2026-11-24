import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/payments/success")({
  validateSearch: (search) =>
    z.object({ property: z.string().optional(), ref: z.string().optional() }).parse(search),
  component: PaymentSuccess,
});

function PaymentSuccess() {
  const search = Route.useSearch();
  const property = search.property ? String(search.property) : "your stay";
  const reference = search.ref ? String(search.ref) : "—";

  return (
    <div className="pt-32 pb-20 px-4">
      <div className="mx-auto max-w-2xl rounded-3xl bg-card p-8 shadow-soft text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <h1 className="mt-4 font-display text-3xl font-bold">Payment update received</h1>
        <p className="mt-3 text-muted-foreground">
          Your payment is being verified. A booking is confirmed and a receipt is issued only after
          the payment provider confirms the transaction.
        </p>
        <div className="mt-6 rounded-2xl border p-4 text-left text-sm">
          <div className="flex justify-between py-2"><span className="text-muted-foreground">Stay</span><span className="font-semibold">{property}</span></div>
          <div className="flex justify-between py-2"><span className="text-muted-foreground">Reference</span><span className="font-semibold">{reference}</span></div>
          <div className="flex justify-between py-2"><span className="text-muted-foreground">Status</span><span className="font-semibold">Awaiting verification</span></div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/bookings" className="rounded-full border px-5 py-2.5 text-sm font-semibold hover:bg-muted">View my stays</Link>
          <Link to="/properties" className="rounded-full gradient-brand text-white px-5 py-2.5 text-sm font-semibold hover:shadow-lift transition">Find another stay</Link>
        </div>
      </div>
    </div>
  );
}
