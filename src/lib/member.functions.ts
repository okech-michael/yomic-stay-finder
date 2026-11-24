import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProfileInput = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().nullable(),
});

export const getMemberProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id,full_name,phone,avatar_url,created_at,updated_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;

    const { data: profile, error: createError } = await context.supabase
      .from("profiles")
      .insert({ id: context.userId })
      .select("id,full_name,phone,avatar_url,created_at,updated_at")
      .single();
    if (createError) throw new Error(createError.message);
    return profile;
  });

export const updateMemberProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(ProfileInput)
  .handler(async ({ data, context }) => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .upsert(
        {
          id: context.userId,
          full_name: data.full_name,
          phone: data.phone?.trim() || null,
        },
        { onConflict: "id" },
      )
      .select("id,full_name,phone,avatar_url,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return profile;
  });

export const listMemberNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id,booking_id,channel,event_type,subject,body,status,created_at,sent_at")
      .eq("user_id", context.userId)
      .eq("channel", "in_app")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markMemberNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ notificationId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ status: "read" })
      .eq("id", data.notificationId)
      .eq("user_id", context.userId)
      .eq("channel", "in_app");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
