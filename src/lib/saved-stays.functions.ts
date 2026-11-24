import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PropertyId = z.object({ propertyId: z.string().uuid() });

export const listSavedStays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: saved, error: savedError } = await context.supabase
      .from("saved_properties")
      .select("property_id,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (savedError) throw new Error(savedError.message);
    if (!saved?.length) return [];

    const { data: properties, error: propertiesError } = await context.supabase
      .from("properties")
      .select("id,slug,title,location,nightly_rate,currency,cover_image,property_type")
      .in(
        "id",
        saved.map((item) => item.property_id),
      );
    if (propertiesError) throw new Error(propertiesError.message);

    const propertyById = new Map((properties ?? []).map((property) => [property.id, property]));
    return saved.flatMap((item) => {
      const property = propertyById.get(item.property_id);
      return property ? [{ ...property, saved_at: item.created_at }] : [];
    });
  });

export const isPropertySaved = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(PropertyId)
  .handler(async ({ data, context }) => {
    const { data: saved, error } = await context.supabase
      .from("saved_properties")
      .select("property_id")
      .eq("user_id", context.userId)
      .eq("property_id", data.propertyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(saved);
  });

export const saveStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(PropertyId)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_properties").insert({
      user_id: context.userId,
      property_id: data.propertyId,
    });
    if (error && error.code !== "23505") throw new Error(error.message);
    return { ok: true };
  });

export const removeSavedStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(PropertyId)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_properties")
      .delete()
      .eq("user_id", context.userId)
      .eq("property_id", data.propertyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
