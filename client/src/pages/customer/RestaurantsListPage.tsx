import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { restaurantsApi } from '../../api/endpoints';
import type { Restaurant } from '../../types';
import { RestaurantCard } from '../../components/RestaurantCard';

export default function RestaurantsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const initialCuisine = searchParams.get('cuisine') ?? '';
  const initialCity = searchParams.get('city') ?? '';
  const sort = searchParams.get('sort') ?? 'rating';

  const [q, setQ] = useState(initialQ);
  const [cuisine, setCuisine] = useState(initialCuisine);
  const [city, setCity] = useState(initialCity);
  const [items, setItems] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    restaurantsApi
      .list({ q: q || undefined, cuisine: cuisine || undefined, city: city || undefined, sort, perPage: 24 })
      .then((res) => setItems(res.data.data))
      .finally(() => setLoading(false));
  }, [q, cuisine, city, sort]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (q) p.set('q', q); else p.delete('q');
      if (cuisine) p.set('cuisine', cuisine); else p.delete('cuisine');
      if (city) p.set('city', city); else p.delete('city');
      return p;
    });
  };

  const heading = useMemo(() => {
    if (cuisine) return `${cuisine} restaurants`;
    if (q) return `Results for "${q}"`;
    return 'All restaurants';
  }, [cuisine, q]);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-[1fr_180px_180px_auto]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search restaurants, dishes..."
            className="input pl-9"
          />
        </div>
        <input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Cuisine" className="input" />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="input" />
        <button type="submit" className="btn-primary">Filter</button>
      </form>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-ink-500">Sort:</span>
        {[
          { v: 'rating', label: 'Top rated' },
          { v: 'newest', label: 'Newest' },
          { v: 'name', label: 'A–Z' },
        ].map((s) => (
          <button
            key={s.v}
            onClick={() =>
              setSearchParams((prev) => {
                const p = new URLSearchParams(prev);
                p.set('sort', s.v);
                return p;
              })
            }
            className={`badge cursor-pointer ${sort === s.v ? 'bg-brand-500 text-white' : 'badge-neutral'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-72 animate-pulse" />)
        ) : items.length ? (
          items.map((r) => <RestaurantCard key={r._id} restaurant={r} />)
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-ink-200 p-12 text-center text-ink-500">
            No restaurants matched your filters.
          </div>
        )}
      </div>
    </div>
  );
}
