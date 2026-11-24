import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { listProperties } from "@/lib/properties.functions";
import { PropertyCard } from "@/components/site/PropertyCard";
import { SITE } from "@/lib/site";

const searchSchema = z.object({
  destination: z.string().optional(),
  propertyType: z.string().optional(),
  maxNightlyRate: z.coerce.number().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guestCount: z.coerce.number().int().min(1).optional(),
  query: z.string().optional(),
});

type SearchFilters = {
  destination: string;
  propertyType: string;
  maxNightlyRate: string;
  checkIn: string;
  checkOut: string;
  guestCount: string;
  amenities: string[];
  query: string;
};

const queryOpts = (filters: SearchFilters) => {
  const hasDateRange = Boolean(filters.checkIn && filters.checkOut);
  return queryOptions({
    queryKey: ["properties", filters],
    queryFn: () =>
      listProperties({
        data: {
          destination: filters.destination || undefined,
          propertyType: filters.propertyType || undefined,
          maxNightlyRate: filters.maxNightlyRate ? Number(filters.maxNightlyRate) : undefined,
          amenities: filters.amenities,
          checkIn: hasDateRange ? filters.checkIn : undefined,
          checkOut: hasDateRange ? filters.checkOut : undefined,
          guestCount: filters.guestCount ? Number(filters.guestCount) : undefined,
          query: filters.query || undefined,
          limit: 60,
        },
      }),
  });
};

export const Route = createFileRoute("/properties")({
  head: () => ({
    meta: [
      { title: `Find a Stay — ${SITE.name}` },
      {
        name: "description",
        content:
          "Find verified short-stay accommodation across Kenya. Compare nightly rates, facilities, and locations, then book before you travel.",
      },
      { property: "og:title", content: `Find a Stay — ${SITE.name}` },
      { property: "og:description", content: "Know where you'll stay before you travel." },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      queryOpts({
        destination: "",
        propertyType: "",
        maxNightlyRate: "",
        checkIn: "",
        checkOut: "",
        guestCount: "",
        amenities: [],
        query: "",
      }),
    ),
  component: Properties,
});

function Properties() {
  const search = Route.useSearch();
  const [filters, setFilters] = useState<SearchFilters>({
    destination: search.destination ?? "",
    propertyType: search.propertyType ?? "",
    maxNightlyRate: search.maxNightlyRate ? String(search.maxNightlyRate) : "",
    checkIn: search.checkIn ?? "",
    checkOut: search.checkOut ?? "",
    guestCount: search.guestCount ? String(search.guestCount) : "",
    amenities: [],
    query: search.query ?? "",
  });
  const { data } = useSuspenseQuery(queryOpts(filters));

  const toggleAmenity = (amenity: string) =>
    setFilters((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((item) => item !== amenity)
        : [...current.amenities, amenity],
    }));

  const clearFilters = () =>
    setFilters({
      destination: "",
      propertyType: "",
      maxNightlyRate: "",
      checkIn: "",
      checkOut: "",
      guestCount: "",
      amenities: [],
      query: "",
    });

  return (
    <div className="pt-28 pb-20 bg-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 animate-fade-up">
          <span className="text-xs uppercase tracking-widest font-semibold text-primary">
            Short-stay accommodation
          </span>
          <h1 className="mt-2 font-display text-4xl md:text-5xl font-bold">Find a Stay</h1>
          <p className="mt-2 text-muted-foreground">
            Compare verified places and arrange your stay before travelling.
          </p>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-8">
          <aside className="lg:sticky lg:top-24 self-start space-y-5 rounded-3xl bg-card p-6 shadow-soft h-fit">
            <div className="flex items-center gap-2 font-display text-lg font-semibold">
              <SlidersHorizontal className="h-4 w-4 text-primary" /> Search stays
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Destination or accommodation
              </label>
              <div className="mt-1.5 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={filters.query}
                  onChange={(event) => setFilters({ ...filters, query: event.target.value })}
                  placeholder="City, area, or name"
                  className="w-full rounded-xl border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Destination
              </label>
              <select
                value={filters.destination}
                onChange={(event) => setFilters({ ...filters, destination: event.target.value })}
                className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All destinations</option>
                {SITE.destinations.map((destination) => (
                  <option key={destination}>{destination}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Arrival
                <input
                  type="date"
                  value={filters.checkIn}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      checkIn: event.target.value,
                      checkOut:
                        filters.checkOut && filters.checkOut <= event.target.value
                          ? ""
                          : filters.checkOut,
                    })
                  }
                  className="mt-1.5 block w-full rounded-xl border bg-background px-2 py-2.5 text-xs font-normal normal-case"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Departure
                <input
                  type="date"
                  value={filters.checkOut}
                  min={filters.checkIn || new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setFilters({ ...filters, checkOut: event.target.value })}
                  className="mt-1.5 block w-full rounded-xl border bg-background px-2 py-2.5 text-xs font-normal normal-case"
                />
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Guests
              </label>
              <input
                type="number"
                min={1}
                value={filters.guestCount}
                onChange={(event) => setFilters({ ...filters, guestCount: event.target.value })}
                placeholder="Any number"
                className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Accommodation type
              </label>
              <select
                value={filters.propertyType}
                onChange={(event) => setFilters({ ...filters, propertyType: event.target.value })}
                className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Any type</option>
                {SITE.propertyTypes.map((propertyType) => (
                  <option key={propertyType}>{propertyType}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Max per night (KSh)
              </label>
              <input
                value={filters.maxNightlyRate}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    maxNightlyRate: event.target.value.replace(/[^\d]/g, ""),
                  })
                }
                placeholder="e.g. 5000"
                className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Facilities
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SITE.amenities.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                      filters.amenities.includes(amenity)
                        ? "gradient-brand text-white border-transparent"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-xl border px-3 py-2.5 text-sm font-medium hover:bg-muted transition"
            >
              Clear all
            </button>
          </aside>

          <div>
            <div className="mb-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{data.length}</span> stays available
              for your search
            </div>
            {data.length === 0 ? (
              <div className="rounded-3xl border border-dashed p-16 text-center">
                <p className="text-muted-foreground">
                  No stays match these dates and filters yet.
                </p>
                <Link to="/contact" className="mt-4 inline-block text-primary font-semibold">
                  Tell us what you're looking for
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {data.map((property, index) => (
                  <PropertyCard key={property.id} p={property} index={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
