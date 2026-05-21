import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { restaurantsApi } from '../../api/endpoints';
import type { Restaurant } from '../../types';
import { RestaurantCard } from '../../components/RestaurantCard';
import { CuisineChips, allCuisines } from '../../components/CuisineChips';

export default function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restaurantsApi
      .list({ perPage: 8, sort: 'rating' })
      .then((res) => setRestaurants(res.data.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white">
        <div className="container-page relative z-10 grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
              <Sparkles size={14} /> Local restaurants. Fair prices.
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Hot, fresh food.<br /> At your door in minutes.
            </h1>
            <p className="mt-4 max-w-lg text-white/85">
              Discover hand-picked restaurants in your city, browse rich menus with photos, and check out
              securely with Stripe or Cash on Delivery.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/restaurants" className="btn bg-white text-brand-700 hover:bg-ink-100">
                Browse restaurants <ArrowRight size={18} />
              </Link>
              <Link to="/register" className="btn ring-1 ring-white/30 hover:bg-white/10">
                Create an account
              </Link>
            </div>
            <div className="mt-10 grid gap-6 text-sm text-white/85 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <Clock size={18} /> Live order status tracking
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} /> Stripe-secured payments
              </div>
              <div className="flex items-start gap-3">
                <Sparkles size={18} /> Loved by 500+ customers
              </div>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute -top-10 -right-10 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
            <img
              src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80"
              alt="Delicious meal"
              className="relative aspect-[4/3] w-full rounded-3xl object-cover shadow-elevated"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Browse by cuisine</h2>
            <p className="text-sm text-ink-500">Tap a cuisine to filter the restaurants below.</p>
          </div>
        </div>
        <CuisineChips cuisines={allCuisines} className="mt-6" linkPrefix="/restaurants" />
      </section>

      <section className="container-page py-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Top rated near you</h2>
            <p className="text-sm text-ink-500">Hand-picked restaurants with the best ratings.</p>
          </div>
          <Link to="/restaurants" className="hidden text-sm font-semibold text-brand-500 hover:text-brand-600 sm:inline-flex">
            View all <ArrowRight size={14} className="ml-1 inline" />
          </Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-72 animate-pulse" />)
            : restaurants.map((r) => <RestaurantCard key={r._id} restaurant={r} />)}
        </div>
      </section>
    </div>
  );
}
