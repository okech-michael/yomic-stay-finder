import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bed,
  CalendarDays,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createBooking } from "@/lib/accommodation.functions";
import { getProperty, listProperties } from "@/lib/properties.functions";
import { formatKsh } from "@/lib/site";
import { PropertyCard } from "@/components/site/PropertyCard";

const propQuery = (slug: string) =>
  queryOptions({ queryKey: ["property", slug], queryFn: () => getProperty({ data: { slug } }) });
const relatedQuery = () =>
  queryOptions({
    queryKey: ["properties", "related"],
    queryFn: () => listProperties({ data: { limit: 6 } }),
  });

export const Route = createFileRoute("/properties/$slug")({
  head: ({ loaderData }: { loaderData?: any }) => ({
    meta: [
      {
        title: loaderData?.title
          ? `${loaderData.title} — Umoja Housing Agency`
          : "Property — Umoja Housing Agency",
      },
      {
        name: "description",
        content:
          loaderData?.description?.slice(0, 160) ??
          "Verified property listing in the Gusii Region.",
      },
      { property: "og:title", content: loaderData?.title ?? "Property" },
      { property: "og:description", content: loaderData?.description?.slice(0, 160) ?? "" },
      { property: "og:image", content: loaderData?.cover_image ?? loaderData?.images?.[0] ?? "" },
    ],
  }),
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(propQuery(params.slug));
    if (!p) throw notFound();
    await context.queryClient.ensureQueryData(relatedQuery());
    return p;
  },
  component: PropertyDetail,
  notFoundComponent: () => (
    <div className="pt-32 pb-20 text-center">
      <h1 className="font-display text-3xl font-bold">Property not found</h1>
      <Link to="/properties" className="mt-4 inline-block text-primary font-semibold">
        Back to listings
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="pt-32 pb-20 text-center">
      <h1 className="font-display text-3xl font-bold">Could not load property</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function PropertyDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data: p } = useSuspenseQuery(propQuery(slug));
  const { data: related } = useSuspenseQuery(relatedQuery());
  const startBooking = useServerFn(createBooking);
  const [active, setActive] = useState(0);
  const [bookingError, setBookingError] = useState<string | null>(null);

  if (!p) return null;
  const images = p.images?.length ? p.images : p.cover_image ? [p.cover_image] : [];
  const cover =
    images[active] ?? "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200";
  const today = new Date().toISOString().slice(0, 10);

  async function bookStay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await startBooking({
        data: {
          propertyId: p?.id ?? "",
          checkIn: String(form.get("check_in")),
          checkOut: String(form.get("check_out")),
          guestCount: Number(form.get("guest_count")),
          paymentMethod: String(form.get("payment_method")) as "mpesa" | "card",
          phone: String(form.get("phone") || ""),
          email: String(form.get("email") || "") || undefined,
          specialRequests: String(form.get("special_requests") || "") || undefined,
        },
      });
      if (result.checkout.checkoutUrl) window.location.assign(result.checkout.checkoutUrl);
      else if (result.checkout.instructions) toast.message(result.checkout.instructions);
      await navigate({ to: "/bookings" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start your booking.";
      setBookingError(message);
      toast.error(message);
    }
  }

  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Link
          to="/properties"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </Link>

        <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-8">
          {/* Gallery */}
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lift">
              <img src={cover} alt={p.title} className="h-full w-full object-cover" />
              <span className="absolute top-4 left-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                Verified stay
              </span>
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.slice(0, 5).map((img, i) => (
                  <button
                    key={img + i}
                    onClick={() => setActive(i)}
                    className={`aspect-square overflow-hidden rounded-xl border-2 transition ${i === active ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={img} className="h-full w-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
                  {p.property_type}
                </span>
                {p.featured && (
                  <span className="rounded-full gradient-brand text-white px-3 py-1 text-xs font-semibold">
                    Featured
                  </span>
                )}
              </div>
              <h1 className="mt-3 font-display text-3xl md:text-4xl font-bold leading-tight">
                {p.title}
              </h1>
              <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4" /> {p.location} · {p.region}
              </div>
            </div>
            <div className="rounded-3xl gradient-deep text-white p-6 shadow-lift">
              <div className="text-sm text-white/70">Nightly rate</div>
              <div className="font-display text-4xl font-bold">{formatKsh(p.nightly_rate)}</div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/10 p-3">
                  <Users className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs text-white/70">Guests</div>
                  <div className="font-semibold">{p.max_guests}</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <Bed className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs text-white/70">Bedrooms</div>
                  <div className="font-semibold">{p.bedrooms ?? 0}</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <CalendarDays className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs text-white/70">Minimum</div>
                  <div className="font-semibold">{p.min_nights} night{p.min_nights === 1 ? "" : "s"}</div>
                </div>
              </div>
            </div>

            <form onSubmit={bookStay} className="space-y-3 rounded-3xl bg-card p-6 shadow-soft">
              <h2 className="font-display text-xl font-bold">Book your stay</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-muted-foreground">
                  Arrival
                  <input name="check_in" type="date" min={today} required className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Departure
                  <input name="check_out" type="date" min={today} required className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" />
                </label>
              </div>
              <label className="block text-xs font-semibold text-muted-foreground">
                Guests
                <input name="guest_count" type="number" min="1" max={p.max_guests} defaultValue="1" required className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">
                Payment method
                <select name="payment_method" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm">
                  <option value="mpesa">M-Pesa</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">
                M-Pesa phone (if selected)
                <input name="phone" type="tel" placeholder="2547…" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">
                Email for receipt
                <input name="email" type="email" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">
                Note to host (optional)
                <textarea name="special_requests" rows={2} maxLength={2000} className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" />
              </label>
              {bookingError && <p role="alert" className="text-sm text-destructive">{bookingError}</p>}
              <button className="w-full rounded-full gradient-brand px-6 py-3.5 font-semibold text-white shadow-soft hover:shadow-lift transition">
                Continue to secure payment
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Sign in is required to book. Payment, fees, and cancellation terms are shown before confirmation.
              </p>
              <Link to="/auth" className="block text-center text-sm font-semibold text-primary">Sign in or create an account</Link>
            </form>
          </div>
        </div>

        {/* Details */}
        <div className="mt-12 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl bg-card p-8 shadow-soft">
            <h2 className="font-display text-2xl font-bold">About this property</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed whitespace-pre-line">
              {p.description ||
                "Beautifully presented property in a convenient location. Contact the agent for full details and a viewing."}
            </p>
            <h3 className="mt-8 font-display text-xl font-semibold">Amenities</h3>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(p.amenities ?? []).length === 0 && (
                <span className="text-sm text-muted-foreground">Contact agent for details</span>
              )}
              {(p.amenities ?? []).map((a) => (
                <div key={a} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {a}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-card p-8 shadow-soft">
            <h3 className="font-display text-xl font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Verified by Umoja
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This accommodation has passed listing verification. Full address and directions are
              available with your confirmed booking.
            </p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Property Type</dt>
                <dd className="font-semibold">{p.property_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-semibold">{p.location}</dd>
              </div>
              <div className="flex justify-between">
                  <dt className="text-muted-foreground">Nightly rate</dt>
                  <dd className="font-semibold">{formatKsh(p.nightly_rate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cleaning fee</dt>
                  <dd className="font-semibold">{formatKsh(p.cleaning_fee)}</dd>
              </div>
              <div className="flex justify-between">
                  <dt className="text-muted-foreground">Check-in</dt>
                  <dd className="font-semibold">{p.check_in_time.slice(0, 5)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Check-out</dt>
                  <dd className="font-semibold">{p.check_out_time.slice(0, 5)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Related */}
        <div className="mt-20">
          <h2 className="font-display text-3xl font-bold mb-8">Similar properties</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related
              .filter((r) => r.id !== p.id)
              .slice(0, 3)
              .map((r, i) => (
                <PropertyCard key={r.id} p={r} index={i} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
