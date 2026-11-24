import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Home,
  MessageSquare,
  BarChart3,
  Inbox,
  ShieldAlert,
  TrendingUp,
  DollarSign,
  MapPin,
  Users,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  RotateCcw,
  Settings,
} from "lucide-react";
import {
  adminListProperties,
  adminDeleteProperty,
  checkIsAdmin,
  adminListInquiries,
  adminListMessages,
  adminGetAnalytics,
  adminListAgents,
  adminCreateAgent,
  adminUpdateAgent,
  adminDeleteAgent,
} from "@/lib/admin.functions";
import {
  adminGetPlatformSettings,
  adminListBookings,
  adminListRefunds,
  adminListVerifications,
  adminReviewListing,
  adminReviewRefund,
  adminUpdatePlatformSettings,
} from "@/lib/accommodation.functions";
import { supabase } from "@/integrations/supabase/client";
import { SITE, formatKsh } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: `Admin — ${SITE.shortName}` }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `p-${Date.now()}`
  );
}

function policyNumber(policy: unknown, key: string): number | "" {
  if (typeof policy !== "object" || policy === null || Array.isArray(policy)) return "";
  const value = (policy as Record<string, unknown>)[key];
  return typeof value === "number" ? value : "";
}

function Admin() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(adminListProperties);
  const del = useServerFn(adminDeleteProperty);
  const checkAdmin = useServerFn(checkIsAdmin);
  const listInq = useServerFn(adminListInquiries);
  const listMsg = useServerFn(adminListMessages);
  const analyticsFn = useServerFn(adminGetAnalytics);
  const listAgents = useServerFn(adminListAgents);
  const createAgent = useServerFn(adminCreateAgent);
  const updateAgent = useServerFn(adminUpdateAgent);
  const deleteAgent = useServerFn(adminDeleteAgent);
  const listVerifications = useServerFn(adminListVerifications);
  const reviewListing = useServerFn(adminReviewListing);
  const listBookings = useServerFn(adminListBookings);
  const listRefunds = useServerFn(adminListRefunds);
  const reviewRefund = useServerFn(adminReviewRefund);
  const getPlatformSettings = useServerFn(adminGetPlatformSettings);
  const updatePlatformSettings = useServerFn(adminUpdatePlatformSettings);

  const [tab, setTab] = useState<
    "properties" | "inquiries" | "messages" | "analytics" | "agents" | "verifications" | "bookings" | "refunds" | "settings"
  >("properties");

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkAdmin() });
  const props = useQuery({
    queryKey: ["admin", "props"],
    queryFn: () => list(),
    enabled: !!adminQ.data?.isAdmin,
  });
  const inquiries = useQuery({
    queryKey: ["admin", "inq"],
    queryFn: () => listInq(),
    enabled: tab === "inquiries" && !!adminQ.data?.isAdmin,
  });
  const messages = useQuery({
    queryKey: ["admin", "msg"],
    queryFn: () => listMsg(),
    enabled: tab === "messages" && !!adminQ.data?.isAdmin,
  });
  const analytics = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => analyticsFn(),
    enabled: tab === "analytics" && !!adminQ.data?.isAdmin,
  });
  const agents = useQuery({
    queryKey: ["admin", "agents"],
    queryFn: () => listAgents(),
    enabled: tab === "agents" && !!adminQ.data?.isAdmin,
  });
  const verifications = useQuery({
    queryKey: ["admin", "verifications"],
    queryFn: () => listVerifications(),
    enabled: tab === "verifications" && !!adminQ.data?.isAdmin,
  });
  const bookings = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: () => listBookings(),
    enabled: tab === "bookings" && !!adminQ.data?.isAdmin,
  });
  const refunds = useQuery({
    queryKey: ["admin", "refunds"],
    queryFn: () => listRefunds(),
    enabled: tab === "refunds" && !!adminQ.data?.isAdmin,
  });
  const platformSettings = useQuery({
    queryKey: ["admin", "platform-settings"],
    queryFn: () => getPlatformSettings(),
    enabled: tab === "settings" && !!adminQ.data?.isAdmin,
  });

  const [agentEditing, setAgentEditing] = useState<any | null>(null);
  const [showAgentForm, setShowAgentForm] = useState(false);

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Property deleted");
      qc.invalidateQueries({ queryKey: ["admin", "props"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const saveAgent = useMutation({
    mutationFn: async (data: any) => {
      if (agentEditing?.id) return updateAgent({ data: { id: agentEditing.id, patch: data } });
      return createAgent({ data });
    },
    onSuccess: () => {
      toast.success(agentEditing?.id ? "Agent updated" : "Agent created");
      qc.invalidateQueries({ queryKey: ["admin", "agents"] });
      setShowAgentForm(false);
      setAgentEditing(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const removeAgent = useMutation({
    mutationFn: (id: string) => deleteAgent({ data: { id } }),
    onSuccess: () => {
      toast.success("Agent deleted");
      qc.invalidateQueries({ queryKey: ["admin", "agents"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const reviewListingMutation = useMutation({
    mutationFn: (data: { propertyId: string; status: "approved" | "rejected"; note?: string }) =>
      reviewListing({ data }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "verifications"] });
      await qc.invalidateQueries({ queryKey: ["admin", "props"] });
      toast.success("Listing review saved.");
    },
    onError: (error) => toast.error(error.message),
  });
  const reviewRefundMutation = useMutation({
    mutationFn: (data: { refundId: string; status: "approved" | "rejected"; note?: string }) =>
      reviewRefund({ data }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "refunds"] });
      toast.success("Refund review saved.");
    },
    onError: (error) => toast.error(error.message),
  });
  const savePlatformSettings = useMutation({
    mutationFn: (data: Parameters<typeof updatePlatformSettings>[0]["data"]) =>
      updatePlatformSettings({ data }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
      toast.success("Booking policies saved.");
    },
    onError: (error) => toast.error(error.message),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  if (adminQ.isLoading) {
    return <div className="pt-32 text-center text-muted-foreground">Loading…</div>;
  }

  if (!adminQ.data?.isAdmin) {
    return (
      <div className="pt-32 pb-20 px-4 max-w-xl mx-auto">
        <div className="rounded-3xl bg-card p-10 shadow-soft text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-primary" />
          <h1 className="mt-4 font-display text-2xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is signed in but does not have admin privileges. Ask an existing admin to
            grant you the role, or contact {SITE.email}.
          </p>
          <button
            onClick={signOut}
            className="mt-6 rounded-full border px-5 py-2 text-sm font-semibold hover:bg-muted"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const properties = props.data ?? [];
  const stats = {
    total: properties.length,
    available: properties.filter(
      (p: any) => p.listing_status === "published" && p.verification_status === "verified",
    ).length,
    featured: properties.filter((p: any) => p.featured).length,
    inquiries: inquiries.data?.length ?? 0,
    views: analytics.data?.totalViews ?? 0,
    leads: analytics.data?.leadsGenerated ?? 0,
    revenue: analytics.data?.paymentsReceived ?? 0,
  };

  return (
    <div className="pt-24 pb-20 bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Review stays, monitor bookings, and configure platform policies.
            </p>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Accommodation listings", v: stats.total, icon: Home },
            { label: "Verified and published", v: stats.available, icon: BadgeCheck },
            { label: "Featured stays", v: stats.featured, icon: BarChart3 },
            { label: "Host inquiries", v: stats.inquiries, icon: Inbox },
            { label: "Listing views", v: stats.views, icon: TrendingUp },
            { label: "Payments recorded", v: stats.revenue, icon: DollarSign },
          ].map((s: { label: string; v: number; icon: any }) => (
            <div key={s.label} className="rounded-2xl bg-card p-5 shadow-soft">
              <s.icon className="h-5 w-5 text-primary" />
              <div className="mt-2 text-2xl font-bold font-display">{s.v}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: "properties", label: "Properties", icon: Home },
            { id: "inquiries", label: "Listing Inquiries", icon: Inbox },
            { id: "messages", label: "Contact Messages", icon: MessageSquare },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
            { id: "agents", label: "Agents", icon: Users },
            { id: "verifications", label: "Listing reviews", icon: BadgeCheck },
            { id: "bookings", label: "Bookings", icon: CalendarDays },
            { id: "refunds", label: "Refunds", icon: RotateCcw },
            { id: "settings", label: "Booking policies", icon: Settings },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t.id ? "gradient-brand text-white" : "bg-card hover:bg-muted"}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "analytics" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: "Property views", value: analytics.data?.totalViews ?? 0, icon: TrendingUp },
                { label: "Leads generated", value: analytics.data?.leadsGenerated ?? 0, icon: Inbox },
                { label: "Payments received", value: formatKsh(analytics.data?.paymentsReceived ?? 0), icon: DollarSign },
                { label: "Conversion rate", value: `${analytics.data?.conversionRate ?? "0.0"}%`, icon: BarChart3 },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-card p-5 shadow-soft">
                  <item.icon className="h-5 w-5 text-primary" />
                  <div className="mt-3 text-2xl font-bold font-display">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="rounded-3xl bg-card p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold">Conversion statistics</h2>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border p-3">
                    <span className="text-sm text-muted-foreground">View-to-lead conversion</span>
                    <span className="font-semibold">{analytics.data?.conversionRate ?? "0.0"}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border p-3">
                    <span className="text-sm text-muted-foreground">Viewing fee conversion</span>
                    <span className="font-semibold">{analytics.data?.paymentConversion ?? "0.0"}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border p-3">
                    <span className="text-sm text-muted-foreground">Available listings</span>
                    <span className="font-semibold">{analytics.data?.availableProperties ?? 0}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-card p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold">Popular locations</h2>
                <div className="mt-4 space-y-3">
                  {(analytics.data?.popularLocations ?? []).map((item: any) => (
                    <div key={item.name} className="flex items-center justify-between rounded-2xl border p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.count} listings</span>
                    </div>
                  ))}
                  {!analytics.data?.popularLocations?.length && (
                    <div className="text-sm text-muted-foreground">No location data yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "agents" && (
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Agents</h2>
              <button
                onClick={() => {
                  setAgentEditing(null);
                  setShowAgentForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-full gradient-brand text-white px-4 py-2 text-sm font-semibold hover:shadow-lift transition"
              >
                <Plus className="h-4 w-4" /> New Agent
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(agents.data ?? []).map((agent: any) => (
                    <tr key={agent.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-3 pr-3 font-semibold">{agent.name}</td>
                      <td className="py-3 pr-3">{agent.phone || "—"}</td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs rounded-full px-2 py-0.5 ${agent.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {agent.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 pr-3 flex gap-2">
                        <button onClick={() => { setAgentEditing(agent); setShowAgentForm(true); }} className="p-2 rounded-lg hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => confirm(`Delete "${agent.name}"?`) && removeAgent.mutate(agent.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {!agents.data?.length && <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">No agents yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "verifications" && (
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-bold mb-4">Listings awaiting verification</h2>
            {verifications.error && (
              <p className="mb-4 text-sm text-destructive">{verifications.error.message}</p>
            )}
            <div className="space-y-3">
              {(verifications.data ?? []).map((item) => (
                <div key={item.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{item.property?.title ?? "Accommodation listing"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.property?.location ?? "Location unavailable"} ·{" "}
                        {formatKsh(item.property?.nightly_rate)} per night
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {new Date(item.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={reviewListingMutation.isPending}
                        onClick={() =>
                          reviewListingMutation.mutate({
                            propertyId: item.property_id,
                            status: "approved",
                          })
                        }
                        className="rounded-full gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Verify and publish
                      </button>
                      <button
                        type="button"
                        disabled={reviewListingMutation.isPending}
                        onClick={() =>
                          reviewListingMutation.mutate({
                            propertyId: item.property_id,
                            status: "rejected",
                            note: "Listing needs updates before it can be published.",
                          })
                        }
                        className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!verifications.isLoading && !(verifications.data ?? []).length && (
                <div className="py-10 text-center text-muted-foreground">
                  No listings are waiting for review.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-bold mb-4">Guest bookings</h2>
            {bookings.error && <p className="mb-4 text-sm text-destructive">{bookings.error.message}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">Reference</th>
                    <th className="py-2 pr-3">Stay dates</th>
                    <th className="py-2 pr-3">Guests</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(bookings.data ?? []).map((booking) => (
                    <tr key={booking.id} className="border-b last:border-0">
                      <td className="py-3 pr-3 font-semibold">{booking.booking_reference}</td>
                      <td className="py-3 pr-3">
                        {booking.check_in} – {booking.check_out}
                      </td>
                      <td className="py-3 pr-3">{booking.guest_count}</td>
                      <td className="py-3 pr-3">{formatKsh(booking.total_amount)}</td>
                      <td className="py-3 pr-3 capitalize">{booking.status.replaceAll("_", " ")}</td>
                    </tr>
                  ))}
                  {!bookings.isLoading && !(bookings.data ?? []).length && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        No bookings recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "refunds" && (
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-bold mb-4">Refund requests</h2>
            {refunds.error && <p className="mb-4 text-sm text-destructive">{refunds.error.message}</p>}
            <div className="space-y-3">
              {(refunds.data ?? []).map((refund) => (
                <div key={refund.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {formatKsh(refund.amount)} · {refund.status.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{refund.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Booking {refund.booking_id} · {new Date(refund.created_at).toLocaleString()}
                      </p>
                    </div>
                    {refund.status === "requested" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={reviewRefundMutation.isPending}
                          onClick={() =>
                            reviewRefundMutation.mutate({ refundId: refund.id, status: "approved" })
                          }
                          className="rounded-full gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          Approve review
                        </button>
                        <button
                          type="button"
                          disabled={reviewRefundMutation.isPending}
                          onClick={() =>
                            reviewRefundMutation.mutate({ refundId: refund.id, status: "rejected" })
                          }
                          className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!refunds.isLoading && !(refunds.data ?? []).length && (
                <div className="py-10 text-center text-muted-foreground">No refund requests.</div>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Approving a request records the decision; issuing funds still requires a configured
              payment-provider refund workflow.
            </p>
          </div>
        )}

        {tab === "settings" && (
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-bold">Booking and commission policies</h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              Booking checkout remains unavailable until each required policy is configured.
            </p>
            {platformSettings.error && (
              <p className="mb-4 text-sm text-destructive">{platformSettings.error.message}</p>
            )}
            {platformSettings.data && (
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const methods = form.getAll("payment_method").map(String);
                  const percentage = String(form.get("booking_payment_percent") ?? "");
                  savePlatformSettings.mutate({
                    commission_bps: Number(form.get("commission_bps")),
                    commission_bearer: String(form.get("commission_bearer")) as "host" | "guest",
                    booking_payment_mode: String(form.get("booking_payment_mode")) as
                      | "full"
                      | "first_night"
                      | "percentage",
                    booking_payment_percent: percentage ? Number(percentage) : null,
                    cancellation_policy: {
                      free_cancellation_hours: Number(form.get("free_cancellation_hours")),
                      refund_before_checkin_percent: Number(
                        form.get("refund_before_checkin_percent"),
                      ),
                      refund_after_deadline_percent: Number(
                        form.get("refund_after_deadline_percent"),
                      ),
                    },
                    enabled_payment_methods: methods.filter(
                      (method): method is "mpesa" | "card" =>
                        method === "mpesa" || method === "card",
                    ),
                  });
                }}
              >
                <Field
                  label="Commission (basis points)"
                  name="commission_bps"
                  type="number"
                  defaultValue={platformSettings.data.commission_bps ?? ""}
                  required
                />
                <Select
                  label="Commission paid by"
                  name="commission_bearer"
                  defaultValue={platformSettings.data.commission_bearer ?? ""}
                  options={["", "host", "guest"]}
                />
                <Select
                  label="Amount collected at booking"
                  name="booking_payment_mode"
                  defaultValue={platformSettings.data.booking_payment_mode ?? ""}
                  options={["", "full", "first_night", "percentage"]}
                />
                <Field
                  label="Booking payment percent"
                  name="booking_payment_percent"
                  type="number"
                  defaultValue={platformSettings.data.booking_payment_percent ?? ""}
                />
                <Field
                  label="Free cancellation deadline (hours before arrival)"
                  name="free_cancellation_hours"
                  type="number"
                  defaultValue={policyNumber(platformSettings.data.cancellation_policy, "free_cancellation_hours")}
                  required
                />
                <Field
                  label="Refund before deadline (%)"
                  name="refund_before_checkin_percent"
                  type="number"
                  defaultValue={policyNumber(platformSettings.data.cancellation_policy, "refund_before_checkin_percent")}
                  required
                />
                <Field
                  label="Refund after deadline (%)"
                  name="refund_after_deadline_percent"
                  type="number"
                  defaultValue={policyNumber(platformSettings.data.cancellation_policy, "refund_after_deadline_percent")}
                  required
                />
                <fieldset className="md:col-span-2">
                  <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Enabled payment methods
                  </legend>
                  <div className="mt-2 flex gap-5">
                    {(["mpesa", "card"] as const).map((method) => (
                      <label key={method} className="flex items-center gap-2 text-sm capitalize">
                        <input
                          type="checkbox"
                          name="payment_method"
                          value={method}
                          defaultChecked={platformSettings.data.enabled_payment_methods.includes(method)}
                        />
                        {method}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button
                  disabled={savePlatformSettings.isPending}
                  className="md:col-span-2 justify-self-start rounded-full gradient-brand px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savePlatformSettings.isPending ? "Saving…" : "Save booking policies"}
                </button>
              </form>
            )}
          </div>
        )}

        {tab === "properties" && (
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-bold mb-1">Accommodation listings</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Owner-submitted stays and retained legacy listings. Review new submissions in Listing reviews.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Nightly rate</th>
                    <th className="py-2 pr-3">Listing status</th>
                    <th className="py-2 pr-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-3 pr-3 font-semibold">{p.title}</td>
                      <td className="py-3 pr-3">{p.property_type}</td>
                      <td className="py-3 pr-3">{p.location}</td>
                      <td className="py-3 pr-3 font-semibold">{formatKsh(p.nightly_rate)}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 ${p.listing_status === "published" && p.verification_status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                        >
                          {p.listing_status.replaceAll("_", " ")} · {p.verification_status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 flex gap-2">
                        <button
                          onClick={() => confirm(`Delete "${p.title}"?`) && remove.mutate(p.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {properties.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        No accommodation listings yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "inquiries" && (
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-bold mb-4">Listing Inquiries</h2>
            <div className="space-y-3">
              {(inquiries.data ?? []).map((i: any) => (
                <div key={i.id} className="rounded-2xl border p-4">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div>
                      <div className="font-semibold">
                        {i.full_name}{" "}
                        <span className="text-muted-foreground font-normal">· {i.phone}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {i.location} · {i.property_type ?? "—"} ·{" "}
                        {new Date(i.created_at).toLocaleString()}
                      </div>
                    </div>
                    <a href={`tel:${i.phone}`} className="text-xs font-semibold text-primary">
                      Call
                    </a>
                  </div>
                  {i.message && <p className="mt-2 text-sm text-muted-foreground">{i.message}</p>}
                </div>
              ))}
              {!(inquiries.data ?? []).length && (
                <div className="text-center py-10 text-muted-foreground">No inquiries yet.</div>
              )}
            </div>
          </div>
        )}

        {tab === "messages" && (
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-bold mb-4">Contact Messages</h2>
            <div className="space-y-3">
              {(messages.data ?? []).map((m: any) => (
                <div key={m.id} className="rounded-2xl border p-4">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div>
                      <div className="font-semibold">
                        {m.full_name}{" "}
                        {m.email && (
                          <span className="text-muted-foreground font-normal">· {m.email}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.subject || "No subject"} · {new Date(m.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{m.message}</p>
                </div>
              ))}
              {!(messages.data ?? []).length && (
                <div className="text-center py-10 text-muted-foreground">No messages yet.</div>
              )}
            </div>
          </div>
        )}

        {showAgentForm && (
          <AgentForm
            initial={agentEditing}
            onCancel={() => {
              setShowAgentForm(false);
              setAgentEditing(null);
            }}
            onSubmit={(d) => saveAgent.mutate(d)}
            saving={saveAgent.isPending}
          />
        )}
      </div>
    </div>
  );
}

function AgentForm({
  initial,
  onCancel,
  onSubmit,
  saving,
}: {
  initial: any;
  onCancel: () => void;
  onSubmit: (d: any) => void;
  saving: boolean;
}) {
  function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      name: String(fd.get("name") || ""),
      slug: String(fd.get("slug") || slugify(String(fd.get("name") || "agent"))),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      whatsapp: String(fd.get("whatsapp") || ""),
      bio: String(fd.get("bio") || ""),
      specialties: String(fd.get("specialties") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      avatar_url: String(fd.get("avatar_url") || ""),
      is_active: fd.get("is_active") === "on",
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-4 overflow-auto">
      <form onSubmit={handle} className="w-full max-w-2xl bg-card rounded-3xl p-6 shadow-lift my-8 space-y-4">
        <h3 className="font-display text-2xl font-bold">{initial?.id ? "Edit agent" : "New agent"}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name" name="name" defaultValue={initial?.name} required />
          <Field label="Slug" name="slug" defaultValue={initial?.slug} placeholder="auto-generated" />
          <Field label="Email" name="email" type="email" defaultValue={initial?.email} />
          <Field label="Phone" name="phone" defaultValue={initial?.phone} />
          <Field label="WhatsApp" name="whatsapp" defaultValue={initial?.whatsapp} />
          <Field label="Avatar URL" name="avatar_url" defaultValue={initial?.avatar_url} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Specialties</label>
          <input name="specialties" defaultValue={(initial?.specialties ?? []).join(", ")} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bio</label>
          <textarea name="bio" rows={4} defaultValue={initial?.bio ?? ""} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={initial?.is_active ?? true} /> Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="rounded-full border px-5 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
          <button disabled={saving} className="rounded-full gradient-brand text-white px-6 py-2.5 text-sm font-semibold hover:shadow-lift transition disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, defaultValue, type = "text", required, placeholder }: any) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
function Select({ label, name, defaultValue, options }: any) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((o: string) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
