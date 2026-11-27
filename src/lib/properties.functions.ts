import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type PropertyListing = {
  id: string;
  slug: string | null;
  title: string;
  property_type: string;
  location: string;
  nightly_rate: number | null;
  max_guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  cover_image: string | null;
  images: string[] | null;
  featured: boolean;
  amenities: string[] | null;
  source_name: string | null;
  source_url: string | null;
};

export const listDestinations = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("destinations")
    .select("id,name,region,slug")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

function publicClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const ListSchema = z
  .object({
    destination: z.string().optional(),
    propertyType: z.string().optional(),
    maxNightlyRate: z.coerce.number().optional(),
    amenities: z.array(z.string()).optional(),
    featuredOnly: z.boolean().optional(),
    checkIn: z.string().date().optional(),
    checkOut: z.string().date().optional(),
    guestCount: z.coerce.number().int().min(1).optional(),
    query: z.string().optional(),
    limit: z.coerce.number().min(1).max(60).default(24),
  })
  .partial();

export const listProperties = createServerFn({ method: "GET" })
  .validator(ListSchema)
  .handler(async ({ data }) => {
    const sb = publicClient();
    if (!sb) return [];
    if (Boolean(data.checkIn) !== Boolean(data.checkOut)) {
      throw new Error("Provide both arrival and departure dates.");
    }

    const listingLimit = data.limit ?? 24;
    let q = sb
      .from("properties")
      .select(
        "id,slug,title,property_type,location,region,nightly_rate,currency,max_guests,bedrooms,bathrooms,amenities,cover_image,images,featured",
      )
      .eq("listing_status", "published")
      .eq("verification_status", "verified")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(listingLimit);
    if (data.destination) q = q.eq("location", data.destination);
    if (data.propertyType) q = q.eq("property_type", data.propertyType);
    if (data.maxNightlyRate) q = q.lte("nightly_rate", data.maxNightlyRate);
    if (data.featuredOnly) q = q.eq("featured", true);
    if (data.amenities && data.amenities.length) q = q.contains("amenities", data.amenities);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let result = rows ?? [];
    if (data.query) {
      const needle = data.query.toLocaleLowerCase();
      result = result.filter(
        (property) =>
          property.title.toLocaleLowerCase().includes(needle) ||
          property.location.toLocaleLowerCase().includes(needle),
      );
    }
    if (data.guestCount) {
      result = result.filter((property) => property.max_guests >= data.guestCount!);
    }
    if (data.checkIn && data.checkOut && result.length > 0) {
      const propertyIds = result.map((property) => property.id);
      const { data: unavailableProperties, error: availabilityError } = await sb.rpc(
        "unavailable_property_ids",
        {
          p_property_ids: propertyIds,
          p_check_in: data.checkIn,
          p_check_out: data.checkOut,
        },
      );
      if (availabilityError) throw new Error(availabilityError.message);
      const unavailable = new Set(
        (unavailableProperties ?? []).map(({ property_id }) => property_id),
      );
      result = result.filter((property) => !unavailable.has(property.id));
    }

    const internalListings: PropertyListing[] = result.map((property) => ({
      ...property,
      source_name: null,
      source_url: null,
    }));
    const externalFiltersAreSupported =
      !data.featuredOnly &&
      !data.propertyType &&
      !data.maxNightlyRate &&
      !data.guestCount &&
      !data.amenities?.length;
    if (!externalFiltersAreSupported) return internalListings.slice(0, listingLimit);

    let destinationId: string | undefined;
    if (data.destination) {
      const { data: destination, error: destinationError } = await sb
        .from("destinations")
        .select("id")
        .eq("name", data.destination)
        .maybeSingle();
      if (destinationError) throw new Error(destinationError.message);
      destinationId = destination?.id;
      if (!destinationId) return internalListings.slice(0, listingLimit);
    }

    let externalQuery = sb
      .from("external_listings")
      .select("id,title,town,source_name,source_url")
      .eq("is_active", true)
      .order("title")
      .limit(500);
    if (destinationId) externalQuery = externalQuery.eq("destination_id", destinationId);
    const { data: externalRows, error: externalError } = await externalQuery;
    if (externalError) throw new Error(externalError.message);
    const needle = data.query?.toLocaleLowerCase();
    const externalListings: PropertyListing[] = (externalRows ?? [])
      .filter(
        (listing) =>
          !needle ||
          listing.title.toLocaleLowerCase().includes(needle) ||
          listing.town.toLocaleLowerCase().includes(needle),
      )
      .map((listing) => ({
        id: listing.id,
        slug: null,
        title: listing.title,
        property_type: "External listing",
        location: listing.town,
        nightly_rate: null,
        max_guests: null,
        bedrooms: null,
        bathrooms: null,
        cover_image: null,
        images: null,
        featured: false,
        amenities: null,
        source_name: listing.source_name,
        source_url: listing.source_url,
      }));

    return [...internalListings, ...externalListings].slice(0, listingLimit);
  });

export const getProperty = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    if (!sb) return null;
    const { data: row, error } = await sb
      .from("properties")
      .select("*")
      .eq("slug", data.slug)
      .eq("listing_status", "published")
      .eq("verification_status", "verified")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const recordPropertyView = createServerFn({ method: "POST" })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    if (!sb) return { ok: true };
    const { data: row, error: fetchError } = await sb
      .from("properties")
      .select("id,view_count")
      .eq("slug", data.slug)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!row) return { ok: true };
    const { error } = await sb
      .from("properties")
      .update({ view_count: Number(row.view_count ?? 0) + 1 })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  if (!sb) {
    return {
      listed: 0,
      available: 0,
      confirmedBookings: 0,
      destinations: 0,
    };
  }
  const { data, error } = await sb.rpc("get_public_platform_counts");
  if (error) throw new Error(error.message);
  const counts = data?.[0];
  return {
    listed: counts?.listed ?? 0,
    available: counts?.available ?? 0,
    confirmedBookings: counts?.confirmed_bookings ?? 0,
    destinations: counts?.destinations ?? 0,
  };
});
