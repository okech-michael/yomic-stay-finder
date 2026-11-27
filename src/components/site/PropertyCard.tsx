import { Link } from "@tanstack/react-router";
import { Bed, Eye, MapPin, Users } from "lucide-react";
import { formatKsh } from "@/lib/site";
import type { PropertyListing } from "@/lib/properties.functions";

export function PropertyCard({ p, index = 0 }: { p: PropertyListing; index?: number }) {
  const img =
    p.cover_image ||
    p.images?.[0] ||
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800";
  const card = (
    <div className="overflow-hidden rounded-3xl bg-card shadow-soft hover:shadow-lift transition-all duration-500 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={img}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          {p.featured && (
            <span className="rounded-full gradient-brand px-3 py-1 text-xs font-semibold text-white">
              Featured
            </span>
          )}
          <span className="rounded-full glass px-3 py-1 text-xs font-medium text-foreground">
            {p.property_type}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="rounded-full bg-emerald-500/95 px-3 py-1 text-xs font-semibold text-white">
            Verified
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="flex items-center gap-1.5 text-xs text-white/90">
            <MapPin className="h-3.5 w-3.5" />
            {p.location}
          </div>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {p.title}
        </h3>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {(p.bedrooms ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="h-4 w-4" /> {p.bedrooms}
              </span>
            )}
            <span className="flex items-center gap-1" title="Maximum guests">
              <Users className="h-4 w-4" /> {p.max_guests} guests
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">From / night</div>
            <div className="font-display text-lg font-bold text-secondary">
              {formatKsh(p.nightly_rate)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="flex flex-wrap gap-1">
            {(p.amenities ?? []).slice(0, 3).map((a) => (
              <span
                key={a}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                {a}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-all group-hover:gap-2">
            <Eye className="h-3.5 w-3.5" /> View
          </span>
        </div>
      </div>
    </div>
  );

  const className = "group block animate-fade-up";
  const style = { animationDelay: `${Math.min(index * 60, 400)}ms` };
  return (
    <Link
      to="/properties/$slug"
      params={{ slug: p.slug ?? "" }}
      className={className}
      style={style}
    >
      {card}
    </Link>
  );
}
