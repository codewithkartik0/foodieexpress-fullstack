import { Star, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Restaurant } from '../types';
import { formatINR } from '../lib/format';

const fallbackCover =
  'https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=800&q=80';

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      to={`/restaurants/${restaurant._id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="relative h-40 w-full overflow-hidden bg-ink-100">
        <img
          src={restaurant.coverImage || restaurant.images[0] || fallbackCover}
          alt={restaurant.name}
          className="h-full w-full object-cover transition group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {restaurant.cuisine.slice(0, 2).map((c) => (
            <span key={c} className="badge bg-white/90 text-ink-800">{c}</span>
          ))}
        </div>
        {restaurant.rating > 0 && (
          <span className="badge absolute right-3 top-3 bg-emerald-500 text-white">
            <Star size={12} className="-ml-0.5" /> {restaurant.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-semibold text-ink-900 line-clamp-1">{restaurant.name}</h3>
        {restaurant.description && (
          <p className="line-clamp-1 text-sm text-ink-500">{restaurant.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between text-xs text-ink-500">
          <span className="inline-flex items-center gap-1"><MapPin size={12} /> {restaurant.address.city}</span>
          <span className="inline-flex items-center gap-1"><Clock size={12} /> 30–40 min</span>
          <span>{formatINR(restaurant.costForTwo)} for two</span>
        </div>
      </div>
    </Link>
  );
}
