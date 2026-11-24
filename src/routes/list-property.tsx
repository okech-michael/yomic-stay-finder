import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Building2, CalendarDays, CheckCircle2, ShieldCheck, Users } from "lucide-react";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/list-property")({
  head: () => ({
    meta: [
      { title: `Host a Stay — ${SITE.name}` },
      {
        name: "description",
        content:
          "List and manage short-stay accommodation, set nightly rates, manage availability, and welcome guests travelling across Kenya.",
      },
      { property: "og:title", content: `Host a stay with ${SITE.shortName}` },
      { property: "og:description", content: "Welcome guests who book before they travel." },
    ],
  }),
  component: ListProperty,
});

const benefits = [
  {
    icon: Users,
    title: "Reach travelling guests",
    text: "Share your verified accommodation with guests planning their arrival in advance.",
  },
  {
    icon: CalendarDays,
    title: "Manage your calendar",
    text: "Set nightly rates and keep availability up to date from your host dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Build guest confidence",
    text: "Submit your property for verification and provide clear details before guests book.",
  },
];

const steps = [
  "Create an account and enable host access",
  "Add your accommodation, photos, and nightly rate",
  "Submit the listing for verification",
  "Manage availability and welcome confirmed guests",
];

function ListProperty() {
  return (
    <div className="pt-28 pb-20">
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <span className="text-xs uppercase tracking-widest font-semibold text-primary">
              For accommodation owners
            </span>
            <h1 className="mt-2 font-display text-4xl md:text-5xl font-bold text-balance">
              Welcome guests who know where they are staying before they travel.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              List an apartment, guest house, inn, or other short-stay accommodation. Set nightly
              rates, manage open dates, and receive reservations from guests planning ahead.
            </p>
            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-2xl bg-card p-5 shadow-soft border-t-2 border-primary"
                >
                  <benefit.icon className="h-6 w-6 text-primary" />
                  <div className="mt-2 font-semibold text-sm">{benefit.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{benefit.text}</div>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold">How hosting works</h2>
              <ol className="mt-4 space-y-3">
                {steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="h-7 w-7 rounded-full gradient-brand text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm pt-1">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="rounded-3xl bg-card p-8 shadow-lift">
            <div className="text-center py-10">
              <Building2 className="h-16 w-16 mx-auto text-primary" />
              <h2 className="mt-4 font-display text-2xl font-bold">Start hosting</h2>
              <p className="mt-2 text-muted-foreground">
                Sign in to create your host profile, add a stay, and submit it for verification.
                You control your rates and availability in the host dashboard.
              </p>
              <Link
                to="/owner"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full gradient-brand px-6 py-3.5 font-semibold text-white shadow-soft hover:shadow-lift transition"
              >
                Open host dashboard <CheckCircle2 className="h-4 w-4" />
              </Link>
              <p className="mt-4 text-xs text-muted-foreground">
                Commission and cancellation settings will be shown before platform bookings are
                enabled.
              </p>
            </div>
            <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 shrink-0 text-primary" />
                <p>
                  Listings remain private until they have been reviewed and verified by the{" "}
                  {SITE.name} team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
