import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarDays, MapPin, ReceiptText, Star } from "lucide-react";
import { BookingConversation } from "@/components/site/BookingConversation";
import { guestCancelBooking, guestListBookings, reviewCompletedStay } from "@/lib/accommodation.functions";
import { formatKsh } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/bookings")({
  ssr: false,
  head: () => ({ meta: [{ title: "My stays — Umoja" }, { name: "robots", content: "noindex" }] }),
  component: GuestBookings,
});

function GuestBookings() {
  const queryClient = useQueryClient();
  const getBookings = useServerFn(guestListBookings);
  const cancel = useServerFn(guestCancelBooking);
  const bookings = useQuery({ queryKey: ["guest", "bookings"], queryFn: () => getBookings() });
  const cancellation = useMutation({
    mutationFn: (data: { bookingId: string; reason: string }) => cancel({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest", "bookings"] });
      toast.success("Cancellation request submitted.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (bookings.isLoading) return <div className="pt-32 text-center text-muted-foreground">Loading your stays…</div>;
  if (bookings.isError) return <div className="pt-32 text-center text-destructive">Could not load your bookings. {bookings.error.message}</div>;
  const rows = bookings.data ?? [];

  return (
    <div className="pt-28 pb-20 bg-surface min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-8">
          <span className="text-xs uppercase tracking-widest font-semibold text-primary">Guest account</span>
          <h1 className="mt-2 font-display text-3xl font-bold">My stays</h1>
          <p className="text-sm text-muted-foreground">Your confirmed accommodation, receipts, and host conversations.</p>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-12 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 font-display text-xl font-semibold">No stays booked yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Arrange your accommodation before your next trip.</p>
            <Link to="/properties" className="mt-5 inline-block rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white">Explore stays</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {rows.map((booking) => (
              <article key={booking.id} className="space-y-4 rounded-3xl bg-card p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    {booking.property?.cover_image && (
                      <img src={booking.property.cover_image} alt="" className="h-20 w-24 rounded-2xl object-cover" />
                    )}
                    <div>
                      <h2 className="font-display text-xl font-semibold">{booking.property?.title ?? "Accommodation"}</h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" /> {booking.property?.location}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Booking reference: {booking.booking_reference}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{booking.status.replace("_", " ")}</span>
                </div>

                <div className="grid gap-3 rounded-2xl border p-4 text-sm sm:grid-cols-3">
                  <div><span className="block text-xs text-muted-foreground">Arrival</span><strong>{booking.check_in}</strong></div>
                  <div><span className="block text-xs text-muted-foreground">Departure</span><strong>{booking.check_out}</strong></div>
                  <div><span className="block text-xs text-muted-foreground">Guests / nights</span><strong>{booking.guest_count} guests · {booking.nights} nights</strong></div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{formatKsh(booking.total_amount)} total</p>
                    {booking.receipt && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <ReceiptText className="h-3.5 w-3.5" /> Receipt {booking.receipt.receipt_number} · paid {formatKsh(booking.receipt.amount_paid)} · balance {formatKsh(booking.receipt.balance_due)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {booking.property?.address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          booking.property.latitude && booking.property.longitude
                            ? `${booking.property.latitude},${booking.property.longitude}`
                            : booking.property.address,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted"
                      >
                        Directions
                      </a>
                    )}
                    {booking.host?.phone && <a href={`tel:${booking.host.phone}`} className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted">Call host</a>}
                    {(booking.status === "pending_payment" || booking.status === "confirmed") && (
                      <button
                        onClick={() => {
                          const reason = window.prompt("Why do you need to cancel this stay?");
                          if (reason?.trim()) cancellation.mutate({ bookingId: booking.id, reason: reason.trim() });
                        }}
                        disabled={cancellation.isPending}
                        className="rounded-full border border-destructive/30 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5"
                      >
                        Request cancellation
                      </button>
                    )}
                  </div>
                </div>

                {booking.status === "completed" && !booking.review && (
                  <StayReview bookingId={booking.id} />
                )}
                <BookingConversation bookingId={booking.id} />
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StayReview({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient();
  const submitReview = useServerFn(reviewCompletedStay);
  const review = useMutation({
    mutationFn: (data: { rating: number; reviewText: string }) =>
      submitReview({ data: { bookingId, ...data } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest", "bookings"] });
      toast.success("Thanks for sharing your stay review.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <form
      className="rounded-2xl border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        review.mutate({
          rating: Number(form.get("rating")),
          reviewText: String(form.get("review") || ""),
        });
      }}
    >
      <h3 className="flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-primary" /> Review your stay</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_auto]">
        <select name="rating" defaultValue="5" className="rounded-xl border bg-background px-3 py-2 text-sm">
          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
        </select>
        <input name="review" maxLength={3000} placeholder="Share a helpful note for future guests" className="rounded-xl border bg-background px-3 py-2 text-sm" />
        <button disabled={review.isPending} className="rounded-full gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Submit review</button>
      </div>
    </form>
  );
}
