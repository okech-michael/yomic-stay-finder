import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/payments/failure")({
  component: PaymentFailure,
});

function PaymentFailure() {
  return (
    <div className="pt-32 pb-20 px-4">
      <div className="mx-auto max-w-2xl rounded-3xl bg-card p-8 shadow-soft text-center">
        <AlertCircle className="mx-auto h-14 w-14 text-red-600" />
        <h1 className="mt-4 font-display text-3xl font-bold">Payment could not be completed</h1>
        <p className="mt-3 text-muted-foreground">
          Your stay booking payment was not completed. Check your booking status before trying again
          to avoid submitting a duplicate payment.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/bookings" className="rounded-full border px-5 py-2.5 text-sm font-semibold hover:bg-muted">Check my stays</Link>
          <Link to="/contact" className="rounded-full gradient-brand text-white px-5 py-2.5 text-sm font-semibold hover:shadow-lift transition">Contact support</Link>
        </div>
      </div>
    </div>
  );
}
