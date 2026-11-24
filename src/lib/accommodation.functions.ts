import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { getPaymentGateway } from "@/lib/payment-gateway";

const ListingInput = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional().nullable(),
  property_type: z.string().min(2).max(50),
  destination_id: z.string().uuid(),
  location: z.string().min(2).max(100),
  address: z.string().max(200).optional().nullable(),
  nightly_rate: z.coerce.number().positive(),
  cleaning_fee: z.coerce.number().min(0).default(0),
  currency: z.string().length(3).default("KES"),
  max_guests: z.coerce.number().int().min(1).max(50),
  min_nights: z.coerce.number().int().min(1).max(365).default(1),
  bedrooms: z.coerce.number().int().min(0).max(100).default(0),
  bathrooms: z.coerce.number().min(0).max(100).default(1),
  check_in_time: z.string().regex(/^\d{2}:\d{2}$/).default("15:00"),
  check_out_time: z.string().regex(/^\d{2}:\d{2}$/).default("10:00"),
  house_rules: z.string().max(3000).optional().nullable(),
  amenities: z.array(z.string().max(80)).max(50).default([]),
  images: z.array(z.string().url()).max(20).default([]),
  cover_image: z.string().url().optional().nullable(),
});

const SettingsInput = z.object({
  commission_bps: z.coerce.number().int().min(0).max(10000),
  commission_bearer: z.enum(["host", "guest"]),
  booking_payment_mode: z.enum(["full", "first_night", "percentage"]),
  booking_payment_percent: z.coerce.number().min(1).max(100).optional().nullable(),
  cancellation_policy: z.object({
    free_cancellation_hours: z.coerce.number().int().min(0).max(8760),
    refund_before_checkin_percent: z.coerce.number().min(0).max(100),
    refund_after_deadline_percent: z.coerce.number().min(0).max(100),
  }),
  enabled_payment_methods: z.array(z.enum(["mpesa", "card"])).min(1),
}).superRefine((value, context) => {
  if (value.booking_payment_mode === "percentage" && value.booking_payment_percent == null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Set a payment percentage for percentage-based bookings.",
      path: ["booking_payment_percent"],
    });
  }
});

async function requireRole(
  context: { supabase: SupabaseClient<Database>; userId: string },
  role: Database["public"]["Enums"]["app_role"],
) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", role)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`The ${role.replace("_", " ")} role is required.`);
}

export const requestPropertyOwnerRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("request_property_owner_role");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const isPropertyOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "property_owner")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  });

export const createOwnerListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(ListingInput)
  .handler(async ({ data, context }) => {
    await requireRole(context, "property_owner");
    const { data: property, error } = await context.supabase
      .from("properties")
      .insert({
        ...data,
        owner_id: context.userId,
        listing_status: "draft",
        verification_status: "pending",
        verified_at: null,
        rent: null,
        available: false,
        cover_image: data.cover_image ?? data.images[0] ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return property;
  });

export const ownerListListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, "property_owner");
    const { data, error } = await context.supabase
      .from("properties")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const submitListingForVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ propertyId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await requireRole(context, "property_owner");
    const { data: verificationId, error } = await context.supabase.rpc(
      "submit_listing_verification",
      { p_property_id: data.propertyId },
    );
    if (error) throw new Error(error.message);
    return { verificationId };
  });

export const setOwnerAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      propertyId: z.string().uuid(),
      stayDate: z.string().date(),
      isAvailable: z.boolean(),
      nightlyRateOverride: z.coerce.number().positive().optional().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, "property_owner");
    const { error } = await context.supabase.from("property_availability").upsert(
      {
        property_id: data.propertyId,
        stay_date: data.stayDate,
        is_available: data.isAvailable,
        nightly_rate_override: data.nightlyRateOverride ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "property_id,stay_date" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ownerListBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, "property_owner");
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*")
      .eq("owner_id", context.userId)
      .order("check_in", { ascending: true });
    if (error) throw new Error(error.message);
    if (!data?.length) return [];
    const [propertiesResult, guestsResult] = await Promise.all([
      context.supabase
        .from("properties")
        .select("id,title,location,address,latitude,longitude")
        .in("id", data.map((booking) => booking.property_id)),
      context.supabase
        .from("profiles")
        .select("id,full_name,phone")
        .in("id", data.map((booking) => booking.guest_id)),
    ]);
    if (propertiesResult.error) throw new Error(propertiesResult.error.message);
    if (guestsResult.error) throw new Error(guestsResult.error.message);
    const properties = new Map((propertiesResult.data ?? []).map((property) => [property.id, property]));
    const guests = new Map((guestsResult.data ?? []).map((guest) => [guest.id, guest]));
    return data.map((booking) => ({
      ...booking,
      property: properties.get(booking.property_id) ?? null,
      guest: guests.get(booking.guest_id) ?? null,
    }));
  });

export const ownerUpdateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ bookingId: z.string().uuid(), status: z.enum(["checked_in", "completed"]) }))
  .handler(async ({ data, context }) => {
    await requireRole(context, "property_owner");
    const { error } = await context.supabase.rpc("owner_update_booking_status", {
      p_booking_id: data.bookingId,
      p_status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const guestListBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*")
      .eq("guest_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!data?.length) return [];
    const bookingIds = data.map((booking) => booking.id);
    const [propertiesResult, hostsResult, receiptsResult, reviewsResult] = await Promise.all([
      context.supabase
        .from("properties")
        .select("id,title,location,address,latitude,longitude,cover_image")
        .in("id", data.map((booking) => booking.property_id)),
      context.supabase
        .from("profiles")
        .select("id,full_name,phone")
        .in("id", data.map((booking) => booking.owner_id)),
      context.supabase
        .from("booking_receipts")
        .select("*")
        .in("booking_id", bookingIds),
      context.supabase
        .from("property_reviews")
        .select("id,booking_id,rating,review_text")
        .in("booking_id", bookingIds),
    ]);
    if (propertiesResult.error) throw new Error(propertiesResult.error.message);
    if (hostsResult.error) throw new Error(hostsResult.error.message);
    if (receiptsResult.error) throw new Error(receiptsResult.error.message);
    if (reviewsResult.error) throw new Error(reviewsResult.error.message);
    const properties = new Map((propertiesResult.data ?? []).map((property) => [property.id, property]));
    const hosts = new Map((hostsResult.data ?? []).map((host) => [host.id, host]));
    const receipts = new Map((receiptsResult.data ?? []).map((receipt) => [receipt.booking_id, receipt]));
    const reviews = new Map((reviewsResult.data ?? []).map((review) => [review.booking_id, review]));
    return data.map((booking) => ({
      ...booking,
      property: properties.get(booking.property_id) ?? null,
      host: hosts.get(booking.owner_id) ?? null,
      receipt: receipts.get(booking.id) ?? null,
      review: reviews.get(booking.id) ?? null,
    }));
  });

export const guestCancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ bookingId: z.string().uuid(), reason: z.string().min(2).max(1000) }))
  .handler(async ({ data, context }) => {
    const { data: cancellationId, error } = await context.supabase.rpc("guest_cancel_booking", {
      p_booking_id: data.bookingId,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { cancellationId };
  });

export const reviewCompletedStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      bookingId: z.string().uuid(),
      rating: z.coerce.number().int().min(1).max(5),
      reviewText: z.string().max(3000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: booking, error: bookingError } = await context.supabase
      .from("bookings")
      .select("property_id,status")
      .eq("id", data.bookingId)
      .eq("guest_id", context.userId)
      .single();
    if (bookingError) throw new Error(bookingError.message);
    if (booking.status !== "completed") throw new Error("Reviews are available after checkout.");
    const { error } = await context.supabase.from("property_reviews").insert({
      booking_id: data.bookingId,
      property_id: booking.property_id,
      guest_id: context.userId,
      rating: data.rating,
      review_text: data.reviewText || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      propertyId: z.string().uuid(),
      checkIn: z.string().date(),
      checkOut: z.string().date(),
      guestCount: z.coerce.number().int().min(1).max(50),
      paymentMethod: z.enum(["mpesa", "card"]),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      specialRequests: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const gateway = getPaymentGateway(data.paymentMethod);
    const { data: bookingId, error: bookingError } = await context.supabase.rpc("create_booking", {
      p_property_id: data.propertyId,
      p_check_in: data.checkIn,
      p_check_out: data.checkOut,
      p_guest_count: data.guestCount,
      p_payment_method: data.paymentMethod,
      p_special_requests: data.specialRequests ?? null,
    });
    if (bookingError) throw new Error(bookingError.message);
    if (!bookingId) throw new Error("The booking request did not return a reference.");

    const { data: booking, error: loadError } = await context.supabase
      .from("bookings")
      .select("id,booking_reference,total_amount,amount_due,currency")
      .eq("id", bookingId)
      .single();
    if (loadError) throw new Error(loadError.message);
    const { data: payment, error: paymentError } = await context.supabase
      .from("booking_payments")
      .select("id")
      .eq("booking_id", bookingId)
      .single();
    if (paymentError) throw new Error(paymentError.message);

    let checkout;
    try {
      checkout = await gateway.createCheckout({
        bookingId,
        paymentId: payment.id,
        bookingReference: booking.booking_reference,
        amount: booking.amount_due,
        currency: booking.currency,
        phone: data.phone,
        email: data.email,
      });
    } catch (error) {
      const { error: cancelError } = await context.supabase.rpc("guest_cancel_booking", {
        p_booking_id: bookingId,
        p_reason: "Payment could not be initiated.",
      });
      if (cancelError) {
        throw new Error(`Payment setup failed and the pending booking could not be released: ${cancelError.message}`);
      }
      throw error;
    }

    const { error: updateError } = await supabaseAdmin
      .from("booking_payments")
      .update({
        status: "processing",
        provider_reference: checkout.providerReference,
        checkout_url: checkout.checkoutUrl ?? null,
      })
      .eq("id", payment.id);
    if (updateError) throw new Error(updateError.message);
    return { bookingId, bookingReference: booking.booking_reference, checkout };
  });

export const getBookingConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ bookingId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: conversation, error: conversationError } = await context.supabase
      .from("booking_conversations")
      .select("id")
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    if (conversationError) throw new Error(conversationError.message);
    if (!conversation) return [];
    const { data: messages, error } = await context.supabase
      .from("booking_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return messages ?? [];
  });

export const sendBookingMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ bookingId: z.string().uuid(), body: z.string().trim().min(1).max(5000) }))
  .handler(async ({ data, context }) => {
    const { data: conversation, error: conversationError } = await context.supabase
      .from("booking_conversations")
      .select("id")
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    if (conversationError) throw new Error(conversationError.message);
    if (!conversation) throw new Error("No booking conversation is available.");
    const { error } = await context.supabase.from("booking_messages").insert({
      conversation_id: conversation.id,
      sender_id: context.userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, "admin");
    const { data, error } = await context.supabase
      .from("platform_settings")
      .select("*")
      .eq("singleton", true)
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const adminUpdatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(SettingsInput)
  .handler(async ({ data, context }) => {
    await requireRole(context, "admin");
    const { error } = await context.supabase
      .from("platform_settings")
      .update({ ...data, updated_by: context.userId, updated_at: new Date().toISOString() })
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, "admin");
    const { data, error } = await context.supabase
      .from("listing_verifications")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!data?.length) return [];
    const properties = await context.supabase
      .from("properties")
      .select("id,title,location,nightly_rate,currency")
      .in("id", (data ?? []).map((item) => item.property_id));
    if (properties.error) throw new Error(properties.error.message);
    const byId = new Map((properties.data ?? []).map((property) => [property.id, property]));
    return (data ?? []).map((item) => ({ ...item, property: byId.get(item.property_id) ?? null }));
  });

export const adminReviewListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      propertyId: z.string().uuid(),
      status: z.enum(["approved", "rejected"]),
      note: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, "admin");
    const { error } = await context.supabase.rpc("admin_review_listing", {
      p_property_id: data.propertyId,
      p_status: data.status,
      p_note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, "admin");
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListRefunds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, "admin");
    const { data, error } = await context.supabase
      .from("booking_refunds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminReviewRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      refundId: z.string().uuid(),
      status: z.enum(["approved", "rejected"]),
      note: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, "admin");
    const { error } = await context.supabase.rpc("admin_review_refund", {
      p_refund_id: data.refundId,
      p_status: data.status,
      p_note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
