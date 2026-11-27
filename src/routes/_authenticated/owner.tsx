import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Pencil,
  Plus,
  Send,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { BookingConversation } from "@/components/site/BookingConversation";
import {
  createOwnerListing,
  isPropertyOwner,
  ownerDeleteAvailability,
  ownerListAvailability,
  ownerListBookings,
  ownerListListings,
  ownerUpdateListing,
  ownerUpdateBookingStatus,
  requestPropertyOwnerRole,
  setOwnerAvailability,
  submitListingForVerification,
} from "@/lib/accommodation.functions";
import { listDestinations } from "@/lib/properties.functions";
import { SITE, formatKsh } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OwnerListing = Database["public"]["Tables"]["properties"]["Row"];

export const Route = createFileRoute("/_authenticated/owner")({
  ssr: false,
  head: () => ({
    meta: [{ title: `Host dashboard — ${SITE.shortName}` }, { name: "robots", content: "noindex" }],
  }),
  component: OwnerDashboard,
});

function OwnerDashboard() {
  const queryClient = useQueryClient();
  const checkOwner = useServerFn(isPropertyOwner);
  const requestOwner = useServerFn(requestPropertyOwnerRole);
  const listProperties = useServerFn(ownerListListings);
  const updateProperty = useServerFn(ownerUpdateListing);
  const listBookings = useServerFn(ownerListBookings);
  const createListing = useServerFn(createOwnerListing);
  const submitVerification = useServerFn(submitListingForVerification);
  const saveAvailability = useServerFn(setOwnerAvailability);
  const updateBooking = useServerFn(ownerUpdateBookingStatus);
  const getDestinations = useServerFn(listDestinations);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<OwnerListing | null>(null);
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
  const updateListing = useMutation({
    mutationFn: (data: Parameters<typeof ownerUpdateListing>[0]["data"]) =>
      updateProperty({ data }),
    onSuccess: async () => {
      setShowForm(false);
      setEditingProperty(null);
      await queryClient.invalidateQueries({ queryKey: ["owner", "listings"] });
      toast.success("Listing updated.");
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
    mutationFn: (data: Parameters<typeof saveAvailability>[0]["data"]) =>
      saveAvailability({ data }),
    onSuccess: async (_result, data) => {
      await queryClient.invalidateQueries({
        queryKey: ["owner", "availability", data.propertyId],
      });
      toast.success("Availability updated.");
    },
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

  if (owner.isLoading)
    return <div className="pt-32 text-center text-muted-foreground">Loading host dashboard…</div>;
  if (owner.isError)
    return (
      <div className="pt-32 text-center text-destructive">
        Could not load your account. {owner.error.message}
      </div>
    );
  if (!owner.data) {
    return (
      <div className="pt-32 pb-20 px-4">
        <div className="mx-auto max-w-xl rounded-3xl bg-card p-10 text-center shadow-soft">
          <Building2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-display text-3xl font-bold">Host your stay</h1>
          <p className="mt-3 text-muted-foreground">
            Create a host account to list short-stay accommodation, set nightly rates, manage dates,
            and welcome guests before they travel.
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
            <span className="text-xs uppercase tracking-widest font-semibold text-primary">
              Property owner
            </span>
            <h1 className="mt-2 font-display text-3xl font-bold">Host dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage your stays, open dates, and guest arrivals.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/bookings"
              className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Guest bookings
            </Link>
            <button
              onClick={() => {
                setEditingProperty(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-full gradient-brand px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Add a stay
            </button>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold">Your stays</h2>
            {listings.isLoading && <p className="text-sm text-muted-foreground">Loading stays…</p>}
            {(listings.error || bookings.error) && (
              <p className="text-sm text-destructive">
                {listings.error?.message ?? bookings.error?.message}
              </p>
            )}
            {!listings.isLoading && listingRows.length === 0 && (
              <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
                No stays listed yet.
              </div>
            )}
            {listingRows.map((property) => (
              <div key={property.id} className="rounded-3xl bg-card p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{property.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {property.location} · {property.property_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      {property.listing_status.replace("_", " ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProperty(property);
                        setShowForm(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit listing
                    </button>
                  </div>
                </div>
                <p className="mt-3 font-semibold">
                  {formatKsh(property.nightly_rate)} / night · up to {property.max_guests} guests
                </p>
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
                    <input
                      name="stay_date"
                      type="date"
                      required
                      min={new Date().toISOString().slice(0, 10)}
                      className="mt-1 block w-full rounded-lg border bg-background px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input name="is_available" type="checkbox" defaultChecked /> Open
                  </label>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Rate override (KSh)
                    <input
                      name="rate"
                      type="number"
                      min="1"
                      className="mt-1 block w-full rounded-lg border bg-background px-2 py-2 text-sm"
                    />
                  </label>
                  <button className="self-end rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">
                    <CalendarDays className="mr-1 inline h-4 w-4" /> Save date
                  </button>
                </form>
                <AvailabilityRules propertyId={property.id} />
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold">Reservations & guest arrivals</h2>
            {!bookings.isLoading && bookingRows.length === 0 && (
              <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
                New reservations will appear here.
              </div>
            )}
            {bookingRows.map((booking) => (
              <div key={booking.id} className="space-y-4 rounded-3xl bg-card p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {booking.property?.title ?? "Stay reservation"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {booking.guest?.full_name ?? "Guest"} ·{" "}
                      {booking.guest?.phone ?? "No phone on profile"}
                    </p>
                    <p className="mt-1 text-sm">
                      {booking.check_in} → {booking.check_out} · {booking.guest_count} guests
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {booking.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm font-semibold">{formatKsh(booking.total_amount)} total</p>
                <div className="flex flex-wrap gap-2">
                  {booking.status === "confirmed" && (
                    <button
                      onClick={() =>
                        changeBooking.mutate({ bookingId: booking.id, status: "checked_in" })
                      }
                      className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted"
                    >
                      Check guest in
                    </button>
                  )}
                  {booking.status === "checked_in" && (
                    <button
                      onClick={() =>
                        changeBooking.mutate({ bookingId: booking.id, status: "completed" })
                      }
                      className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted"
                    >
                      Mark completed
                    </button>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      booking.property?.latitude && booking.property.longitude
                        ? `${booking.property.latitude},${booking.property.longitude}`
                        : (booking.property?.address ?? booking.property?.location ?? ""),
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
            initial={editingProperty ?? undefined}
            onClose={() => {
              setShowForm(false);
              setEditingProperty(null);
            }}
            onSubmit={(data) =>
              editingProperty
                ? updateListing.mutate({ propertyId: editingProperty.id, patch: data })
                : saveListing.mutate(data)
            }
            saving={saveListing.isPending || updateListing.isPending}
          />
        )}
      </div>
    </div>
  );
}

function AvailabilityRules({ propertyId }: { propertyId: string }) {
  const queryClient = useQueryClient();
  const listAvailability = useServerFn(ownerListAvailability);
  const saveAvailability = useServerFn(setOwnerAvailability);
  const deleteAvailability = useServerFn(ownerDeleteAvailability);
  const rules = useQuery({
    queryKey: ["owner", "availability", propertyId],
    queryFn: () => listAvailability({ data: { propertyId } }),
  });
  const setRule = useMutation({
    mutationFn: (data: Parameters<typeof setOwnerAvailability>[0]["data"]) =>
      saveAvailability({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "availability", propertyId] });
      toast.success("Availability updated.");
    },
    onError: (error) => toast.error(error.message),
  });
  const removeRule = useMutation({
    mutationFn: (stayDate: string) => deleteAvailability({ data: { propertyId, stayDate } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "availability", propertyId] });
      toast.success("Date rule removed.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="mt-4 rounded-2xl border p-4">
      <h4 className="text-sm font-semibold">Upcoming availability rules</h4>
      {rules.isLoading && <p className="mt-2 text-sm text-muted-foreground">Loading dates…</p>}
      {rules.isError && (
        <p className="mt-2 text-sm text-destructive">Could not load dates: {rules.error.message}</p>
      )}
      {!rules.isLoading && rules.data?.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">No date-specific rules yet.</p>
      )}
      {rules.data?.map((rule) => (
        <div
          key={rule.id}
          className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm"
        >
          <div>
            <p className="font-medium">{rule.stay_date}</p>
            <p className="text-xs text-muted-foreground">
              {rule.is_available ? "Open" : "Blocked"} ·{" "}
              {rule.nightly_rate_override == null
                ? "Default nightly rate"
                : `${formatKsh(rule.nightly_rate_override)} override`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setRule.mutate({
                  propertyId,
                  stayDate: rule.stay_date,
                  isAvailable: !rule.is_available,
                  nightlyRateOverride: rule.nightly_rate_override,
                })
              }
              disabled={setRule.isPending || removeRule.isPending}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
            >
              Mark {rule.is_available ? "unavailable" : "available"}
            </button>
            <button
              type="button"
              aria-label={`Remove rule for ${rule.stay_date}`}
              onClick={() => removeRule.mutate(rule.stay_date)}
              disabled={setRule.isPending || removeRule.isPending}
              className="rounded-full border p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListingForm({
  destinations,
  initial,
  onClose,
  onSubmit,
  saving,
}: {
  destinations: Array<{ id: string; name: string; region: string }>;
  initial?: OwnerListing;
  onClose: () => void;
  onSubmit: (data: Parameters<typeof createOwnerListing>[0]["data"]) => void;
  saving: boolean;
}) {
  const [imageUrls, setImageUrls] = useState(initial?.images.join("\n") ?? "");
  const [uploadingImages, setUploadingImages] = useState(false);

  const uploadImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;

    const currentImages = imageUrls
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);
    if (currentImages.length + files.length > 20) {
      toast.error("A listing can have at most 20 photos.");
      return;
    }
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    const invalidFile = files.find(
      (file) => !allowedTypes.has(file.type) || file.size > 8 * 1024 * 1024,
    );
    if (invalidFile) {
      toast.error("Use JPG, PNG, WebP, or AVIF photos under 8 MB each.");
      return;
    }

    setUploadingImages(true);
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!data.user) throw new Error("Sign in again before uploading photos.");

      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "photo";
        const path = `${data.user.id}/${initial?.id ?? "new"}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from("property-images").upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new Error(error.message);
        const { data: publicUrl } = supabase.storage.from("property-images").getPublicUrl(path);
        setImageUrls((current) =>
          [...current.split(/\r?\n/).filter(Boolean), publicUrl.publicUrl].join("\n"),
        );
      }
      toast.success(`${files.length} photo${files.length === 1 ? "" : "s"} uploaded.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload listing photos.");
    } finally {
      setUploadingImages(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/60 p-4 backdrop-blur">
      <form
        className="my-8 w-full max-w-3xl space-y-4 rounded-3xl bg-card p-6 shadow-lift"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const destination = destinations.find(
            (item) => item.id === String(form.get("destination_id")),
          );
          if (!destination) {
            toast.error("Choose a destination.");
            return;
          }
          const title = String(form.get("title"));
          const images = imageUrls
            .split(/\r?\n/)
            .map((url) => url.trim())
            .filter(Boolean);
          onSubmit({
            title,
            slug:
              initial && initial.title === title
                ? initial.slug
                : title
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
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
            images,
            cover_image: String(form.get("cover_image") || "") || images[0] || null,
          });
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">
            {initial ? "Edit listing" : "Add a short-stay listing"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full border px-3 py-1 text-sm">
            Close
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {initial
            ? "Update your listing details, nightly price, and photos."
            : "New stays remain unpublished until the platform verifies them."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Listing title
            <input
              name="title"
              required
              minLength={3}
              defaultValue={initial?.title ?? ""}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Accommodation type
            <select
              name="property_type"
              defaultValue={initial?.property_type ?? SITE.propertyTypes[0]}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            >
              {SITE.propertyTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Destination
            <select
              name="destination_id"
              required
              defaultValue={initial?.destination_id ?? ""}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Select a destination</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name} · {destination.region}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Street address
            <input
              name="address"
              defaultValue={initial?.address ?? ""}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Nightly rate (KSh)
            <input
              name="nightly_rate"
              type="number"
              required
              min="1"
              defaultValue={initial?.nightly_rate ?? ""}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Cleaning fee (KSh)
            <input
              name="cleaning_fee"
              type="number"
              min="0"
              defaultValue={initial?.cleaning_fee ?? 0}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Maximum guests
            <input
              name="max_guests"
              type="number"
              required
              min="1"
              defaultValue={initial?.max_guests ?? 2}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Minimum nights
            <input
              name="min_nights"
              type="number"
              min="1"
              defaultValue={initial?.min_nights ?? 1}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Bedrooms
            <input
              name="bedrooms"
              type="number"
              min="0"
              defaultValue={initial?.bedrooms ?? 1}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Bathrooms
            <input
              name="bathrooms"
              type="number"
              min="0"
              defaultValue={initial?.bathrooms ?? 1}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Check-in time
            <input
              name="check_in_time"
              type="time"
              defaultValue={initial?.check_in_time.slice(0, 5) ?? "15:00"}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Check-out time
            <input
              name="check_out_time"
              type="time"
              defaultValue={initial?.check_out_time.slice(0, 5) ?? "10:00"}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <label className="block text-xs font-semibold text-muted-foreground">
          Description
          <textarea
            name="description"
            rows={3}
            defaultValue={initial?.description ?? ""}
            className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold text-muted-foreground">
          House rules
          <textarea
            name="house_rules"
            rows={2}
            defaultValue={initial?.house_rules ?? ""}
            className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
          />
        </label>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-muted-foreground">
            Listing photos (up to 20)
            <textarea
              name="images"
              rows={3}
              value={imageUrls}
              onChange={(event) => setImageUrls(event.target.value)}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
              placeholder="Uploaded photo URLs appear here; you can also paste authorized image URLs."
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">
            <Upload className="h-4 w-4" />
            {uploadingImages ? "Uploading…" : "Upload photos"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              disabled={uploadingImages}
              onChange={uploadImages}
              className="sr-only"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Upload photos you own or have permission to use. JPG, PNG, WebP, or AVIF; maximum 8 MB
            each.
          </p>
        </div>
        <label className="block text-xs font-semibold text-muted-foreground">
          Cover image URL (optional)
          <input
            name="cover_image"
            defaultValue={initial?.cover_image ?? ""}
            className="mt-1 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          {SITE.amenities.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="amenities"
                value={amenity}
                defaultChecked={initial?.amenities.includes(amenity) ?? false}
              />{" "}
              {amenity}
            </label>
          ))}
        </div>
        <button
          disabled={saving || uploadingImages}
          className="inline-flex items-center gap-2 rounded-full gradient-brand px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {saving ? "Saving…" : initial ? "Save changes" : "Save draft"}
        </button>
      </form>
    </div>
  );
}
