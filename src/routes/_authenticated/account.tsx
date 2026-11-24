import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  CalendarDays,
  Check,
  CircleUserRound,
  Clock3,
  Compass,
  CreditCard,
  MapPin,
  MessageCircle,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { MemberSecuritySettings } from "@/components/site/MemberSecuritySettings";
import { PwaInstallCard } from "@/components/site/PwaInstallCard";
import { guestListBookings } from "@/lib/accommodation.functions";
import {
  getMemberProfile,
  listMemberNotifications,
  markMemberNotificationRead,
  updateMemberProfile,
} from "@/lib/member.functions";
import { listSavedStays, removeSavedStay } from "@/lib/saved-stays.functions";
import { SITE, formatKsh } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/account")({
  ssr: false,
  head: () => ({
    meta: [{ title: `My account — ${SITE.name}` }, { name: "robots", content: "noindex" }],
  }),
  component: MemberAccount,
});

function MemberAccount() {
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const loadProfile = useServerFn(getMemberProfile);
  const saveProfile = useServerFn(updateMemberProfile);
  const loadBookings = useServerFn(guestListBookings);
  const loadNotifications = useServerFn(listMemberNotifications);
  const markRead = useServerFn(markMemberNotificationRead);
  const loadSavedStays = useServerFn(listSavedStays);
  const removeStay = useServerFn(removeSavedStay);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const profile = useQuery({
    queryKey: ["member", "profile", user.id],
    queryFn: () => loadProfile(),
  });
  const bookings = useQuery({
    queryKey: ["guest", "bookings", user.id],
    queryFn: () => loadBookings(),
  });
  const notifications = useQuery({
    queryKey: ["member", "notifications", user.id],
    queryFn: () => loadNotifications(),
  });
  const savedStays = useQuery({
    queryKey: ["member", "saved-stays", user.id],
    queryFn: () => loadSavedStays(),
  });

  useEffect(() => {
    if (!profile.data) return;
    setFullName(profile.data.full_name ?? "");
    setPhone(profile.data.phone ?? "");
  }, [profile.data]);

  const update = useMutation({
    mutationFn: () => saveProfile({ data: { full_name: fullName, phone } }),
    onSuccess: async (savedProfile) => {
      setFullName(savedProfile.full_name ?? "");
      setPhone(savedProfile.phone ?? "");
      await queryClient.invalidateQueries({ queryKey: ["member", "profile", user.id] });
      toast.success("Your profile has been updated.");
    },
    onError: (error) => toast.error(error.message),
  });
  const markAsRead = useMutation({
    mutationFn: (notificationId: string) => markRead({ data: { notificationId } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["member", "notifications", user.id] }),
    onError: (error) => toast.error(error.message),
  });
  const unsaveStay = useMutation({
    mutationFn: (propertyId: string) => removeStay({ data: { propertyId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["member", "saved-stays", user.id] });
      toast.success("Stay removed from your saved list.");
    },
    onError: (error) => toast.error(error.message),
  });

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const upcomingBookings = useMemo(
    () =>
      (bookings.data ?? []).filter(
        (booking) =>
          ["pending_payment", "confirmed", "checked_in"].includes(booking.status) &&
          booking.check_out >= today,
      ),
    [bookings.data, today],
  );
  const unreadCount = (notifications.data ?? []).filter((item) => item.status !== "read").length;
  const displayName =
    fullName ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
    user.email?.split("@")[0] ||
    "traveller";

  return (
    <div className="min-h-screen bg-surface pb-20 pt-28">
      <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6">
        <header id="overview">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Member portal
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold">Welcome, {displayName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your stays, travel details, and account settings in one place.
          </p>
        </header>

        <nav aria-label="Account sections" className="flex flex-wrap gap-2">
          {[
            ["My stays", "#my-stays"],
            ["Saved stays", "#saved-stays"],
            ["Notifications", "#notifications"],
            ["Profile", "#profile"],
            ["Security", "#security"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-muted"
            >
              {label}
            </a>
          ))}
        </nav>

        <PwaInstallCard />

        <section aria-label="Account overview" className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <CalendarDays className="h-6 w-6 text-primary" />
            <div className="mt-3 font-display text-2xl font-bold">
              {bookings.isLoading ? "—" : upcomingBookings.length}
            </div>
            <p className="text-sm text-muted-foreground">Upcoming stays</p>
          </div>
          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <Bell className="h-6 w-6 text-primary" />
            <div className="mt-3 font-display text-2xl font-bold">
              {notifications.isLoading ? "—" : unreadCount}
            </div>
            <p className="text-sm text-muted-foreground">Unread notifications</p>
          </div>
          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <Compass className="h-6 w-6 text-primary" />
            <div className="mt-3 font-display text-2xl font-bold">
              {savedStays.isLoading ? "—" : (savedStays.data?.length ?? 0)}
            </div>
            <p className="text-sm text-muted-foreground">Saved stays</p>
          </div>
        </section>

        <section id="my-stays" className="scroll-mt-24 rounded-3xl bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-primary" />
              <div>
                <h2 className="font-display text-xl font-bold">My stays</h2>
                <p className="text-sm text-muted-foreground">
                  Your upcoming trips, booking status, and payment progress.
                </p>
              </div>
            </div>
            <Link to="/bookings" className="text-sm font-semibold text-primary hover:underline">
              All bookings, receipts & messages
            </Link>
          </div>
          {bookings.isLoading && (
            <p className="mt-6 text-sm text-muted-foreground">Loading your bookings…</p>
          )}
          {bookings.isError && (
            <p className="mt-6 text-sm text-destructive">
              Could not load your bookings. {bookings.error.message}
            </p>
          )}
          {bookings.data && upcomingBookings.length === 0 && (
            <div className="mt-6 rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
              No upcoming stays yet. Find your next place before you travel.
              <Link to="/" className="ml-1 font-semibold text-primary hover:underline">
                Explore stays
              </Link>
            </div>
          )}
          {!!upcomingBookings.length && (
            <div className="mt-6 divide-y">
              {upcomingBookings.slice(0, 3).map((booking) => (
                <article
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold">{booking.property?.title ?? "Accommodation"}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {booking.property?.location ?? "Destination"}
                      <span className="mx-1">·</span>
                      {formatDate(booking.check_in)} – {formatDate(booking.check_out)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">{formatKsh(booking.total_amount)}</p>
                      <span className="text-xs capitalize text-muted-foreground">
                        {booking.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <PaymentStatus
                      status={booking.status}
                      balanceDue={booking.receipt?.balance_due ?? null}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
          {bookings.data && bookings.data.some((booking) => booking.status === "completed") && (
            <p className="mt-4 text-xs text-muted-foreground">
              Past stays and receipts are available in{" "}
              <Link to="/bookings" className="font-semibold text-primary hover:underline">
                booking history
              </Link>
              .
            </p>
          )}
        </section>

        <section
          id="saved-stays"
          className="scroll-mt-24 rounded-3xl bg-card p-6 shadow-soft sm:p-8"
        >
          <div className="flex items-center gap-3">
            <Compass className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-display text-xl font-bold">Saved stays</h2>
              <p className="text-sm text-muted-foreground">
                Keep places you are considering close at hand.
              </p>
            </div>
          </div>
          {savedStays.isLoading && (
            <p className="mt-6 text-sm text-muted-foreground">Loading your saved stays…</p>
          )}
          {savedStays.isError && (
            <p className="mt-6 text-sm text-destructive">
              Could not load saved stays. {savedStays.error.message}
            </p>
          )}
          {savedStays.data?.length === 0 && (
            <div className="mt-6 rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
              You have not saved any stays yet. Use “Save stay” on a property to add it here.
            </div>
          )}
          {!!savedStays.data?.length && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {savedStays.data.map((stay) => (
                <article key={stay.id} className="flex gap-4 rounded-2xl border p-3">
                  <Link
                    to="/properties/$slug"
                    params={{ slug: stay.slug }}
                    className="h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-muted"
                  >
                    {stay.cover_image ? (
                      <img src={stay.cover_image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/properties/$slug"
                      params={{ slug: stay.slug }}
                      className="line-clamp-2 font-semibold hover:text-primary"
                    >
                      {stay.title}
                    </Link>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {stay.location}
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {formatKsh(stay.nightly_rate)}{" "}
                      <span className="font-normal text-muted-foreground">/ night</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => unsaveStay.mutate(stay.id)}
                      disabled={unsaveStay.isPending}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline disabled:opacity-60"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          id="notifications"
          className="scroll-mt-24 rounded-3xl bg-card p-6 shadow-soft sm:p-8"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-display text-xl font-bold">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Booking updates and account notices. Email and SMS delivery depend on provider
                setup.
              </p>
            </div>
          </div>
          {notifications.isLoading && (
            <p className="mt-6 text-sm text-muted-foreground">Loading notifications…</p>
          )}
          {notifications.isError && (
            <p className="mt-6 text-sm text-destructive">
              Could not load notifications. {notifications.error.message}
            </p>
          )}
          {notifications.data?.length === 0 && (
            <div className="mt-6 rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
              You are all caught up. New booking updates will appear here.
            </div>
          )}
          {!!notifications.data?.length && (
            <div className="mt-4 divide-y">
              {notifications.data.map((notification) => (
                <article key={notification.id} className="flex items-start gap-3 py-4">
                  <span
                    className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      notification.status === "read"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {notification.status === "read" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">
                        {notification.subject ?? notification.event_type.replaceAll("_", " ")}
                      </h3>
                      <time className="text-xs text-muted-foreground">
                        {formatDateTime(notification.created_at)}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {notification.body}
                    </p>
                    {notification.status !== "read" && (
                      <button
                        type="button"
                        onClick={() => markAsRead.mutate(notification.id)}
                        disabled={markAsRead.isPending}
                        className="mt-2 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="profile" className="scroll-mt-24 rounded-3xl bg-card p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-3">
            <CircleUserRound className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-display text-xl font-bold">Personal information</h2>
              <p className="text-sm text-muted-foreground">
                Your information is private to your account and helps hosts coordinate your stay.
              </p>
            </div>
          </div>
          {profile.isLoading && (
            <p className="mt-6 text-sm text-muted-foreground">Loading your profile…</p>
          )}
          {profile.isError && (
            <p className="mt-6 text-sm text-destructive">
              Could not load your profile. {profile.error.message}
            </p>
          )}
          {profile.data && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                update.mutate();
              }}
              className="mt-6 grid gap-4 sm:grid-cols-2"
            >
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full name
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1.5 block w-full rounded-xl border bg-background px-3 py-3 text-sm font-normal normal-case text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone
                <input
                  type="tel"
                  maxLength={30}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+254…"
                  className="mt-1.5 block w-full rounded-xl border bg-background px-3 py-3 text-sm font-normal normal-case text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">
                Email address
                <input
                  type="email"
                  value={user.email ?? ""}
                  readOnly
                  className="mt-1.5 block w-full rounded-xl border bg-muted px-3 py-3 text-sm font-normal normal-case text-foreground"
                />
                <span className="mt-1 block text-xs font-normal normal-case">
                  Update your sign-in email in Account security below.
                </span>
              </label>
              <button
                disabled={update.isPending}
                className="inline-flex w-fit items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {update.isPending ? "Saving…" : "Save profile"}
              </button>
            </form>
          )}
        </section>

        <div id="security" className="scroll-mt-24">
          <MemberSecuritySettings email={user.email ?? ""} />
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/owner"
            className="flex items-center gap-4 rounded-3xl bg-card p-6 shadow-soft transition hover:shadow-lift"
          >
            <Building2 className="h-7 w-7 text-primary" />
            <div>
              <h2 className="font-display text-lg font-bold">Host dashboard</h2>
              <p className="text-sm text-muted-foreground">Manage accommodation you host.</p>
            </div>
          </Link>
          <Link
            to="/contact"
            className="flex items-center gap-4 rounded-3xl bg-card p-6 shadow-soft transition hover:shadow-lift"
          >
            <ShieldCheck className="h-7 w-7 text-primary" />
            <div>
              <h2 className="font-display text-lg font-bold">Help & support</h2>
              <p className="text-sm text-muted-foreground">
                Get help with bookings, payments, or your account.
              </p>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}

function PaymentStatus({ status, balanceDue }: { status: string; balanceDue: number | null }) {
  const pending = balanceDue === null && status === "pending_payment";
  const hasBalance = balanceDue !== null && balanceDue > 0;
  const label = pending
    ? "Payment pending"
    : hasBalance
      ? "Balance due"
      : balanceDue === 0
        ? "Paid"
        : "Receipt available";
  const Icon = pending || hasBalance ? Clock3 : CreditCard;
  return (
    <span
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full ${
        pending || hasBalance
          ? "bg-amber-500/10 text-amber-600"
          : "bg-emerald-500/10 text-emerald-600"
      }`}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
