import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Search,
  MapPin,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Wallet,
  Users,
  HeadphonesIcon,
  Sparkles,
  Quote,
  Phone,
  MessageCircle,
} from "lucide-react";
import { listProperties, getStats } from "@/lib/properties.functions";
import { PropertyCard } from "@/components/site/PropertyCard";
import { Counter } from "@/components/site/Counter";
import { SITE, telLink, whatsappLink } from "@/lib/site";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import catSingle from "@/assets/cat-single.jpg";
import catBedsitter from "@/assets/cat-bedsitter.jpg";
import catOnebed from "@/assets/cat-onebed.jpg";
import catTwobed from "@/assets/cat-twobed.jpg";
import catThreebed from "@/assets/cat-threebed.jpg";
import catBungalow from "@/assets/cat-bungalow.jpg";
import catApartment from "@/assets/cat-apartment.jpg";
import catCommercial from "@/assets/cat-commercial.jpg";

const featuredOpts = queryOptions({
  queryKey: ["properties", "featured"],
  queryFn: () => listProperties({ data: { featuredOnly: true, limit: 6 } }),
});
const allOpts = queryOptions({
  queryKey: ["properties", "home"],
  queryFn: () => listProperties({ data: { limit: 6 } }),
});
const statsOpts = queryOptions({ queryKey: ["stats"], queryFn: () => getStats() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Umoja Housing Agency — Book a Stay Before You Travel" },
      {
        name: "description",
        content:
          "Find verified short-stay accommodation across Kenya. Compare nightly rates, choose your dates, and arrange where you will stay before you travel.",
      },
      {
        property: "og:title",
        content: "Umoja Housing Agency — Know Where You'll Stay Before You Travel",
      },
      {
        property: "og:description",
        content:
          "Book verified accommodation in an unfamiliar destination before you set off.",
      },
      { property: "og:image", content: "/__l5e/assets-v1/placeholder/og.jpg" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(featuredOpts),
      context.queryClient.ensureQueryData(allOpts),
      context.queryClient.ensureQueryData(statsOpts),
    ]);
  },
  component: Index,
});

const heroImages = [hero1, hero2, hero3];
const categories = [
  { name: "Apartment", img: catApartment },
  { name: "Serviced Apartment", img: catOnebed },
  { name: "Guest House", img: catThreebed },
  { name: "Inn", img: catBungalow },
  { name: "Hotel", img: catTwobed },
  { name: "Short-stay Rental", img: catBedsitter },
  { name: "Homestay", img: catSingle },
  { name: "Other", img: catCommercial },
];
const steps = [
  { n: "01", title: "Choose a destination", text: "Search the town you are travelling to." },
  { n: "02", title: "Set your dates", text: "See nightly prices and dates that are open." },
  { n: "03", title: "Compare stays", text: "Review photos, facilities, location, and house rules." },
  { n: "04", title: "Book before you go", text: "Secure your accommodation before leaving home." },
  { n: "05", title: "Get confirmation", text: "Keep your booking details and receipt in one place." },
  { n: "06", title: "Arrive with a plan", text: "Message your host and get directions to your stay." },
];
const reasons = [
  {
    icon: ShieldCheck,
    title: "Verified stays",
    text: "Listings are reviewed before guests can book them.",
  },
  {
    icon: Users,
    title: "Local destination knowledge",
    text: "Compare neighbourhoods and places to stay before you travel.",
  },
  {
    icon: Zap,
    title: "Plan ahead",
    text: "Choose dates and arrange your stay before arriving in town.",
  },
  {
    icon: Wallet,
    title: "Clear nightly pricing",
    text: "See accommodation rates and booking terms before confirming.",
  },
  {
    icon: MapPin,
    title: "Arrival directions",
    text: "Access the location details for the stay you booked.",
  },
  {
    icon: HeadphonesIcon,
    title: "Stay connected",
    text: "Keep your booking details and host conversation together.",
  },
];
const testimonials = [
  {
    name: "Before you leave",
    role: "Plan your arrival",
    text: "Know where you will stay before travelling to an unfamiliar destination.",
  },
  {
    name: "While you compare",
    role: "Choose with confidence",
    text: "Compare nightly prices, photos, amenities, and neighbourhoods in advance.",
  },
  {
    name: "When you arrive",
    role: "Go straight to your stay",
    text: "Keep your booking confirmation, host contact, and directions close at hand.",
  },
];

function Index() {
  const { data: featured } = useSuspenseQuery(featuredOpts);
  const { data: all } = useSuspenseQuery(allOpts);
  const { data: stats } = useSuspenseQuery(statsOpts);
  const showcase = (featured.length ? featured : all).slice(0, 6);

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroImages.length), 6000);
    return () => clearInterval(t);
  }, []);

  const [tIndex, setTIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTIndex((i) => (i + 1) % testimonials.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-screen flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {heroImages.map((src, i) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity duration-[2000ms] ${i === slide ? "opacity-100" : "opacity-0"}`}
            >
              <img
                src={src}
                alt="Premium home"
                className="h-full w-full object-cover animate-slow-zoom"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 via-secondary/30 to-secondary/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_30%,oklch(0.15_0.05_240_/_0.6))]" />
        </div>
        <div className="relative z-10 w-full mx-auto max-w-7xl px-4 sm:px-6 pb-20 pt-32 text-white">
          <div className="max-w-3xl space-y-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-2 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Short stays across Kenya
            </span>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] text-balance">
              Know Where You'll Stay{" "}
              <span className="bg-gradient-to-r from-primary to-orange-300 bg-clip-text text-transparent">
                Before You Travel
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/85 max-w-2xl">
              Arrive in an unfamiliar town knowing where you will stay. Compare verified short-stay
              accommodation and book before you travel with {SITE.name}.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/properties"
                className="inline-flex items-center gap-2 rounded-full gradient-brand px-7 py-4 text-base font-semibold shadow-lift hover:-translate-y-0.5 transition"
              >
                Find a Stay <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-full glass px-7 py-4 text-base font-semibold text-foreground hover:bg-white transition"
              >
                <MessageCircle className="h-4 w-4" /> Talk to Us
              </a>
            </div>
          </div>

          {/* Search bar */}
          <form
            method="get"
            action="/properties"
            className="mt-10 glass rounded-3xl p-3 sm:p-4 grid grid-cols-1 md:grid-cols-[1.2fr_1.4fr_0.8fr_auto] gap-2 animate-fade-up shadow-lift"
            style={{ animationDelay: "200ms" }}
          >
            <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-background/80">
              <MapPin className="h-4 w-4 text-primary" />
              <select
                name="destination"
                className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
              >
                <option value="">Choose destination</option>
                {SITE.destinations.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-background/80">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
              <span className="grid flex-1 grid-cols-2 gap-2">
                <input name="checkIn" type="date" aria-label="Arrival date" min={new Date().toISOString().slice(0, 10)} className="min-w-0 bg-transparent text-sm font-medium text-foreground outline-none" />
                <input name="checkOut" type="date" aria-label="Departure date" min={new Date().toISOString().slice(0, 10)} className="min-w-0 bg-transparent text-sm font-medium text-foreground outline-none" />
              </span>
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-background/80">
              <Users className="h-4 w-4 text-primary" />
              <select
                name="guestCount"
                className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
              >
                <option value="">Any guests</option>
                {[1, 2, 3, 4, 5, 6, 8, 10].map((guestCount) => (
                  <option key={guestCount} value={guestCount}>{guestCount} guest{guestCount > 1 ? "s" : ""}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-2xl gradient-brand px-6 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 hover:shadow-lift transition"
            >
              <Search className="h-4 w-4" /> Search
            </button>
          </form>

          {/* slide dots */}
          <div className="mt-8 flex gap-2">
            {heroImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-10 bg-primary" : "w-4 bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STATS */}
      <section className="py-20 bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: stats.listed, s: "", label: "Verified stays" },
            { n: stats.confirmedBookings, s: "", label: "Confirmed bookings" },
            { n: stats.destinations, s: "", label: "Destinations" },
            { n: stats.available, s: "", label: "Stays available" },
          ].map((s, i) => (
            <div
              key={i}
              className="text-center p-6 rounded-3xl bg-card shadow-soft hover:shadow-lift transition"
            >
              <div className="font-display text-4xl md:text-5xl font-bold text-secondary">
                <Counter to={s.n} suffix={s.s} />
              </div>
              <div className="mt-2 text-sm text-muted-foreground font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div className="max-w-2xl">
              <span className="text-xs uppercase tracking-widest font-semibold text-primary">
                Featured Stays
              </span>
              <h2 className="mt-2 font-display text-4xl md:text-5xl font-bold text-balance">
                Hand-picked places to stay before you travel
              </h2>
            </div>
            <Link
              to="/properties"
              className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary transition"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {showcase.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-16 text-center text-muted-foreground">
              No stays are available yet. Check back shortly.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((p, i) => (
                <PropertyCard key={p.id} p={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-24 bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase tracking-widest font-semibold text-primary">
              Browse by Type
            </span>
            <h2 className="mt-2 font-display text-4xl md:text-5xl font-bold">
              Explore accommodation types
            </h2>
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {categories.map((c, i) => (
              <Link
                key={c.name}
                to="/properties"
                search={{ propertyType: c.name } as never}
                className="group relative aspect-[4/5] overflow-hidden rounded-3xl shadow-soft hover:shadow-lift transition animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <img
                  src={c.img}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h3 className="font-display text-lg font-semibold">{c.name}</h3>
                  <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-white/80 group-hover:text-primary transition">
                    Explore <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest font-semibold text-primary">
              How It Works
            </span>
            <h2 className="mt-2 font-display text-4xl md:text-5xl font-bold">
              From destination search to arrival
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="group relative p-8 rounded-3xl bg-card border shadow-soft hover:shadow-lift hover:-translate-y-1 transition animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="font-display text-5xl font-bold text-primary/30 group-hover:text-primary transition">
                  {s.n}
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="py-24 gradient-deep text-white relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest font-semibold text-primary">
              Why Choose Us
            </span>
            <h2 className="mt-2 font-display text-4xl md:text-5xl font-bold">
              Arrive with confidence
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reasons.map((r) => (
              <div
                key={r.title}
                className="group glass-dark rounded-3xl p-8 hover:bg-white/10 transition"
              >
                <div className="h-14 w-14 rounded-2xl gradient-brand flex items-center justify-center shadow-glow">
                  <r.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm text-white/75">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-surface">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <span className="text-xs uppercase tracking-widest font-semibold text-primary">
            Testimonials
          </span>
          <h2 className="mt-2 font-display text-4xl md:text-5xl font-bold">
            A clearer arrival plan
          </h2>
          <div className="mt-12 relative h-56">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className={`absolute inset-0 transition-all duration-700 ${i === tIndex ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
              >
                <Quote className="h-10 w-10 mx-auto text-primary/40" />
                <p className="mt-4 font-display text-xl md:text-2xl text-foreground italic text-balance">
                  "{t.text}"
                </p>
                <div className="mt-6">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setTIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === tIndex ? "w-10 bg-primary" : "w-4 bg-border"}`}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] gradient-deep p-12 md:p-16 text-white shadow-lift">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/30 blur-3xl" />
            <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
              <div>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-balance">
                  Ready to book before you travel?
                </h2>
                <p className="mt-4 text-white/80 max-w-xl">
                  Find your stay or register accommodation for travellers arriving in your area.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href={telLink()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-secondary px-6 py-4 font-semibold hover:bg-white/90 transition"
                >
                  <Phone className="h-4 w-4" /> Call Agency
                </a>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center justify-center gap-2 rounded-full gradient-brand px-6 py-4 font-semibold hover:shadow-lift transition"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp Agency
                </a>
                <Link
                  to="/list-property"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 px-6 py-4 font-semibold hover:bg-white/10 transition"
                >
                  <CheckCircle2 className="h-4 w-4" /> Become a Host
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
