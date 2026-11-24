import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, CalendarDays, CheckCircle2, Plus, Send, Users } from "lucide-react";
import { BookingConversation } from "@/components/site/BookingConversation";
import {
  createOwnerListing,
  isPropertyOwner,
  ownerListBookings,
  ownerListListings,
  ownerUpdateBookingStatus,
  requestPropertyOwnerRole,
  setOwnerAvailability,
  submitListingForVerification,
} from "@/lib/accommodation.functions";
import { listDestinations } from "@/lib/properties.functions";
import { SITE, formatKsh } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/owner")({
  ssr: false,
  head: () => ({ meta: [{ title: "Host dashboard — Umoja" }, { name: "robots", content: "noindex" }] }),
  component: OwnerDashboard,
});

function OwnerDashboard() {
  const queryClient = useQueryClient();
  const checkOwner = useServerFn(isPropertyOwner);
  const requestOwner = useServerFn(requestPropertyOwnerRole);
  const listProperties = useServerFn(ownerListListings);
  const listBookings = useServerFn(ownerListBookings);
  const createListing = useServerFn(createOwnerListing);
  const submitVerification = useServerFn(submitListingForVerification);
  const saveAvailability = useServerFn(setOwnerAvailability);
  const updateBooking = useServerFn(ownerUpdateBookingStatus);
  const getDestinations = useServerFn(listDestinations);
  const [showForm, setShowForm] = useState(false);
  const owner = useQuery({ queryKey: ["owner-role"], queryFn: () => checkOwner() });
  const destinations = useQuery({ queryKey: ["destinations"], queryFn: () => getDestinations() });
  const listings = useQuery({
    queryKey: ["owner", "listings"],
    queryFn: () => listProperties(),
    enabled: owner.data === true,
  });
  const bookings = useQuery({
    queryKey: ["owner", "bookings"],
    queryFn: () => listBookings(),
    enabled: owner.data === true,
  });

  const becomeOwner = useMutation({
    mutationFn: () => requestOwner(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner-role"] });
      toast.success("Host account enabled. Add your first stay.");
    },
    onError: (error) => toast.error(error.message),
  });
  const saveListing = useMutation({
    mutationFn: (data: Parameters<typeof createListing>[0]["data"]) => createListing({ data }),
    onSuccess: async () => {
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ["owner", "listings"] });
      toast.success("Draft stay saved. Submit it for verification when ready.");
    },
    onError: (error) => toast.error(error.message),
  });
  const verifyListing = useMutation({
    mutationFn: (propertyId: string) => submitVerification({ data: { propertyId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "listings"] });
      toast.success("Listing submitted for review.");
    },
    onError: (error) => toast.error(error.message),
  });
  const availability = useMutation({
    mutationFn: (data: Parameters<typeof saveAvailability>[0]["data"]) => saveAvailability({ data }),
    onSuccess: () => toast.success("Availability updated."),
    onError: (error) => toast.error(error.message),
  });
  const changeBooking = useMutation({
    mutationFn: (data: { bookingId: string; status: "checked_in" | "completed" }) =>
      updateBooking({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "bookings"] });
      toast.success("Stay status updated.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (owner.isLoading) return <div className="pt-32 text-center text-muted-foreground">Loading host dashboard…</div>;
  if (owner.isError) return <div className="pt-32 text-center text-destructive">Could not load your account. {owner.error.message}</div>;
  if (!owner.data) {
    return (
      <div className="pt-32 pb-20 px-4">
        <div className="mx-auto max-w-xl rounded-3xl bg-card p-10 text-center shadow-soft">
          <Building2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-display text-3xl font-bold">Host your stay</h1>
          <p className="mt-3 text-muted-foreground">
            Create a host account to list short-stay accommodation, set nightly rates, manage dates, and welcome guests before they travel.
          </p>
          <button
            onClick={() => becomeOwner.mutate()}
            disabled={becomeOwner.isPending}
            className="mt-6 rounded-full gradient-brand px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {becomeOwner.isPending ? "Setting up…" : "Become a host"}
          </button>
        </div>
      </div>
    );
  }

  const listingRows = listings.data ?? [];
  const bookingRows = bookings.data ?? [];

  return (
    <div className="pt-28 pb-20 bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase tracking-widest font-semibold text-primary">Property owner</span>
            <h1 className="mt-2 font-display text-3xl font-bold">Host dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your stays, open dates, and guest arrivals.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/bookings" className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">Guest bookings</Link>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-full gradient-brand px-4 py-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> Add a stay
            </button>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold">Your stays</h2>
            {listings.isLoading && <p className="text-sm text-muted-foreground">Loading stays…</p>}
            {(listings.error || bookings.error) && <p className="text-sm text-destructive">{listings.error?.message ?? bookings.error?.message}</p>}
            {!listings.isLoading && listingRows.length === 0 && (
              <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">No stays listed yet.</div>
            )}
            {listingRows.map((property) => (
              <div key={property.id} className="rounded-3xl bg-card p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{property.title}</h3>
                    <p className="text-sm text-muted-foreground">{property.location} · {property.property_type}</p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{property.listing_status.replace("_", " ")}</span>
                </div>
                <p className="mt-3 font-semibold">{formatKsh(property.nightly_rate)} / night · up to {property.max_guests} guests</p>
                {property.listing_status === "draft" && (
                  <button
                    onClick={() => verifyListing.mutate(property.id)}
                    disabled={verifyListing.isPending}
                    className="mt-4 inline-flex items-center gap-2 rounded-full gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Submit for verification
                  </button>
                )}
                <form
                  className="mt-5 grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_auto_1fr_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    availability.mutate({
                      propertyId: property.id,
                      stayDate: String(form.get("stay_date")),
                      isAvailable: form.get("is_available") === "on",
                      nightlyRateOverride: form.get("rate") ? Number(form.get("rate")) : null,
                    });
                  }}
                >
                  <label className="text-xs font-semibold text-muted-foreground">
                    Date
                    <input name="stay_date" type="date" required min={new Date().toISOString().slice(0, 10)} className="mt-1 block w-full rounded-lg border bg-background px-2 py-2 text-sm" />
                  </label>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input name="is_available" type="checkbox" defaultChecked /> Open
                  </label>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Rate override (KSh)
                    <input name="rate" type="number" min="1" className="mt-1 block w-full rounded-lg border bg-background px-2 py-2 text-sm" />
                  </label>
                  <button className="self-end rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">
                    <CalendarDays className="mr-1 inline h-4 w-4" /> Save date
                  </button>
                </form>
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold">Reservations & guest arrivals</h2>
            {!bookings.isLoading && bookingRows.length === 0 && (
              <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">New reservations will appear here.</div>
            )}
            {bookingRows.map((booking) => (
              <div key={booking.id} className="space-y-4 rounded-3xl bg-card p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{booking.property?.title ?? "Stay reservation"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {booking.guest?.full_name ?? "Guest"} · {booking.guest?.phone ?? "No phone on profile"}
                    </p>
                    <p className="mt-1 text-sm">{booking.check_in} → {booking.check_out} · {booking.guest_count} guests</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{booking.status.replace("_", " ")}</span>
                </div>
                <p className="text-sm font-semibold">{formatKsh(booking.total_amount)} total</p>
                <div className="flex flex-wrap gap-2">
                  {booking.status === "confirmed" && (
                    <button onClick={() => changeBooking.mutate({ bookingId: booking.id, status: "checked_in" })} className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted">Check guest in</button>
                  )}
                  {booking.status === "checked_in" && (
                    <button onClick={() => changeBooking.mutate({ bookingId: booking.id, status: "completed" })} className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted">Mark completed</button>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      booking.property?.latitude && booking.property.longitude
                        ? `${booking.property.latitude},${booking.property.longitude}`
                        : booking.property?.address ?? booking.property?.location ?? "",
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted"
                  >
                    Directions
                  </a>
                </div>
                <BookingConversation bookingId={booking.id} />
              </div>
            ))}
          </section>
        </div>

        {showForm && (
          <ListingForm
            destinations={destinations.data ?? []}
            onClose={() => setShowForm(false)}
            onSubmit={(data) => saveListing.mutate(data)}
            saving={saveListing.isPending}
          />
        )}
      </div>
    </div>
  );
}

function ListingForm({
  destinations,
  onClose,
  onSubmit,
  saving,
}: {
  destinations: Array<{ id: string; name: string; region: string }>;
  onClose: () => void;
  onSubmit: (data: Parameters<typeof createOwnerListing>[0]["data"]) => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/60 p-4 backdrop-blur">
      <form
        className="my-8 w-full max-w-3xl space-y-4 rounded-3xl bg-card p-6 shadow-lift"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const destination = destinations.find((item) => item.id === String(form.get("destination_id")));
          if (!destination) {
            toast.error("Choose a destination.");
            return;
          }
          onSubmit({
            title: String(form.get("title")),
            slug: String(form.get("title")).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            description: String(form.get("description") || ""),
            property_type: String(form.get("property_type")),
            destination_id: destination.id,
            location: destination.name,
            address: String(form.get("address") || ""),
            nightly_rate: Number(form.get("nightly_rate")),
            cleaning_fee: Number(form.get("cleaning_fee") || 0),
            currency: "KES",
            max_guests: Number(form.get("max_guests")),
            min_nights: Number(form.get("min_nights") || 1),
            bedrooms: Number(form.get("bedrooms") || 0),
            bathrooms: Number(form.get("bathrooms") || 1),
            check_in_time: String(form.get("check_in_time") || "15:00"),
            check_out_time: String(form.get("check_out_time") || "10:00"),
            house_rules: String(form.get("house_rules") || ""),
            amenities: form.getAll("amenities").map(String),
            images: String(form.get("images") || "").split(/\r?\n/).map((url) => url.trim()).filter(Boolean),
            cover_image: String(form.get("cover_image") || "") || null,
          });
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Add a short-stay listing</h2>
          <button type="button" onClick={onClose} className="rounded-full border px-3 py-1 text-sm">Close</button>
        </div>
        <p className="text-sm text-muted-foreground">New stays remain unpublished until the platform verifies them.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">Listing title<input name="title" required minLength={3} className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Accommodation type<select name="property_type" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm">{SITE.propertyTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">Destination<select name="destination_id" required className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"><option value="">Select a destination</option>{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name} · {destination.region}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">Street address<input name="address" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Nightly rate (KSh)<input name="nightly_rate" type="number" required min="1" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Cleaning fee (KSh)<input name="cleaning_fee" type="number" min="0" defaultValue="0" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Maximum guests<input name="max_guests" type="number" required min="1" defaultValue="2" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Minimum nights<input name="min_nights" type="number" min="1" defaultValue="1" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Bedrooms<input name="bedrooms" type="number" min="0" defaultValue="1" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Bathrooms<input name="bathrooms" type="number" min="0" defaultValue="1" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Check-in time<input name="check_in_time" type="time" defaultValue="15:00" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Check-out time<input name="check_out_time" type="time" defaultValue="10:00" className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
        </div>
        <label className="block text-xs font-semibold text-muted-foreground">Description<textarea name="description" rows={3} className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
        <label className="block text-xs font-semibold text-muted-foreground">House rules<textarea name="house_rules" rows={2} className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
        <label className="block text-xs font-semibold text-muted-foreground">Photo URLs (one per line)<textarea name="images" rows={2} className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
        <div className="flex flex-wrap gap-3">
          {SITE.amenities.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="amenities" value={amenity} /> {amenity}
            </label>
          ))}
        </div>
        <button disabled={saving} className="inline-flex items-center gap-2 rounded-full gradient-brand px-6 py-3 font-semibold text-white disabled:opacity-60">
          <Send className="h-4 w-4" /> {saving ? "Saving…" : "Save draft"}
        </button>
      </form>
    </div>
  );
}
