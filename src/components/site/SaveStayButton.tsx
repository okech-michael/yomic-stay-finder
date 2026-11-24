import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AuthChangeEvent, AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isPropertySaved, removeSavedStay, saveStay } from "@/lib/saved-stays.functions";

export function SaveStayButton({ propertyId }: { propertyId: string }) {
  const queryClient = useQueryClient();
  const checkSaved = useServerFn(isPropertySaved);
  const save = useServerFn(saveStay);
  const remove = useServerFn(removeSavedStay);
  const [userId, setUserId] = useState<string | null | undefined>();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    try {
      supabase.auth
        .getUser()
        .then((response: { data: { user: User | null }; error: AuthError | null }) => {
          if (!active) return;
          const { data, error } = response;
          if (error) {
            toast.error(error.message);
            setAuthError(error.message);
            return;
          }
          setAuthError(null);
          setUserId(data.user?.id ?? null);
        })
        .catch((error: unknown) => {
          if (!active) return;
          toast.error(
            error instanceof Error ? error.message : "Could not check your sign-in status.",
          );
          setAuthError(
            error instanceof Error ? error.message : "Could not check your sign-in status.",
          );
        });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not check your sign-in status.";
      toast.error(message);
      setAuthError(message);
    }
    const { data } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setAuthError(null);
        setUserId(session?.user.id ?? null);
      },
    );
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const saved = useQuery({
    queryKey: ["member", "saved-stay", userId, propertyId],
    queryFn: () => checkSaved({ data: { propertyId } }),
    enabled: Boolean(userId),
  });
  const toggleSaved = useMutation({
    mutationFn: () =>
      saved.data ? remove({ data: { propertyId } }) : save({ data: { propertyId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["member", "saved-stay", userId, propertyId],
      });
      await queryClient.invalidateQueries({ queryKey: ["member", "saved-stays", userId] });
      toast.success(
        saved.data ? "Stay removed from your saved list." : "Stay saved to your account.",
      );
    },
    onError: (error) => toast.error(error.message),
  });

  if (authError) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-destructive opacity-70"
        title={authError}
      >
        <Bookmark className="h-4 w-4" /> Could not verify sign-in
      </button>
    );
  }

  if (userId === null) {
    return (
      <Link
        to="/auth"
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted"
      >
        <Bookmark className="h-4 w-4" /> Sign in to save
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={!userId || saved.isLoading || saved.isError || toggleSaved.isPending}
      onClick={() => toggleSaved.mutate()}
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
      aria-pressed={saved.data ?? false}
    >
      {saved.data ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {userId === undefined
        ? "Checking account…"
        : toggleSaved.isPending
          ? "Saving…"
          : saved.data
            ? "Saved"
            : saved.isError
              ? "Could not load saved status"
              : "Save stay"}
    </button>
  );
}
