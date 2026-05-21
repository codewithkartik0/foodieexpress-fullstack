import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, MapPin, Plus, Minus, Leaf, Drumstick } from 'lucide-react';
import toast from 'react-hot-toast';
import { restaurantsApi } from '../../api/endpoints';
import type { MenuItem, Restaurant, Review } from '../../types';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDate } from '../../lib/format';
import { asMessage } from '../../api/client';

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { cart, addItem, updateItem } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    restaurantsApi
      .detail(id)
      .then((res) => {
        setRestaurant(res.data.data.restaurant);
        setMenu(res.data.data.menu);
        setReviews(res.data.data.reviews);
        const firstCat = res.data.data.menu[0]?.category ?? null;
        setActiveCategory(firstCat);
      })
      .catch(() => toast.error('Could not load this restaurant'))
      .finally(() => setLoading(false));
  }, [id]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((m) => set.add(m.category));
    return Array.from(set);
  }, [menu]);

  const groupedMenu = useMemo(() => {
    const acc: Record<string, MenuItem[]> = {};
    menu.forEach((m) => {
      acc[m.category] = acc[m.category] ?? [];
      acc[m.category].push(m);
    });
    return acc;
  }, [menu]);

  const cartItemQty = (menuItemId: string) =>
    cart.items.find((c) => c.menuItemId === menuItemId)?.quantity ?? 0;

  const cartItemId = (menuItemId: string) =>
    cart.items.find((c) => c.menuItemId === menuItemId)?._id;

  const onAdd = async (item: MenuItem) => {
    if (!user) {
      toast.error('Please sign in to start an order');
      navigate('/login');
      return;
    }
    if (user.role !== 'customer') {
      toast.error('Only customer accounts can place orders');
      return;
    }
    try {
      await addItem(item._id, 1);
    } catch (e) {
      toast.error(asMessage(e, 'Could not add to cart'));
    }
  };

  const onChangeQty = async (item: MenuItem, delta: number) => {
    const current = cart.items.find((c) => c.menuItemId === item._id);
    if (!current?._id) return;
    try {
      await updateItem(current._id, current.quantity + delta);
    } catch (e) {
      toast.error(asMessage(e, 'Could not update cart'));
    }
  };

  if (loading) return <div className="container-page py-12 text-ink-500">Loading...</div>;
  if (!restaurant) return <div className="container-page py-12 text-ink-500">Restaurant not found.</div>;

  return (
    <div>
      {/* Cover */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-ink-200">
        <img
          src={
            restaurant.coverImage ||
            restaurant.images[0] ||
            'https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=1600&q=80'
          }
          alt={restaurant.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="container-page relative z-10 flex h-full items-end pb-6">
          <div className="text-white">
            <h1 className="text-3xl font-extrabold tracking-tight">{restaurant.name}</h1>
            <p className="mt-1 text-white/85">{restaurant.cuisine.join(' • ')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {restaurant.rating > 0 && (
                <span className="badge bg-emerald-500 text-white"><Star size={12} /> {restaurant.rating.toFixed(1)} ({restaurant.ratingCount})</span>
              )}
              <span className="badge bg-white/20 text-white"><MapPin size={12} /> {restaurant.address.city}</span>
              <span className="badge bg-white/20 text-white">{formatINR(restaurant.costForTwo)} for two</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        {restaurant.description && <p className="mb-6 max-w-2xl text-ink-600">{restaurant.description}</p>}
        {/* Category nav */}
        {categories.length > 1 && (
          <nav className="mb-6 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActiveCategory(c);
                  document.getElementById(`cat-${c}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`badge ${activeCategory === c ? 'bg-brand-500 text-white' : 'badge-neutral'} cursor-pointer`}
              >
                {c}
              </button>
            ))}
          </nav>
        )}

        {/* Menu items */}
        <div className="space-y-10">
          {Object.entries(groupedMenu).map(([category, items]) => (
            <section key={category} id={`cat-${category}`}>
              <h2 className="text-xl font-bold tracking-tight">{category}</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {items.map((m) => {
                  const qty = cartItemQty(m._id);
                  const itemId = cartItemId(m._id);
                  return (
                    <div key={m._id} className="card flex items-start gap-4 p-4">
                      {m.imageUrl && (
                        <img src={m.imageUrl} alt={m.name} className="h-24 w-24 flex-shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {m.isVeg ? (
                            <span title="Vegetarian" className="grid h-4 w-4 place-items-center border border-emerald-600">
                              <Leaf size={10} className="text-emerald-600" />
                            </span>
                          ) : (
                            <span title="Non-vegetarian" className="grid h-4 w-4 place-items-center border border-rose-600">
                              <Drumstick size={10} className="text-rose-600" />
                            </span>
                          )}
                          <h3 className="font-semibold text-ink-900">{m.name}</h3>
                        </div>
                        {m.description && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{m.description}</p>}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-semibold text-ink-900">{formatINR(m.price)}</span>
                          {qty === 0 ? (
                            <button onClick={() => onAdd(m)} className="btn-primary px-3 py-1.5"><Plus size={14}/> Add</button>
                          ) : (
                            <div className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 p-1 text-brand-700">
                              <button
                                onClick={() => onChangeQty(m, -1)}
                                aria-label="decrease"
                                className="grid h-7 w-7 place-items-center rounded-md hover:bg-white"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                              <button
                                onClick={() => onChangeQty(m, +1)}
                                aria-label="increase"
                                className="grid h-7 w-7 place-items-center rounded-md hover:bg-white"
                                disabled={!itemId}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Reviews */}
        <section className="mt-14">
          <h2 className="text-xl font-bold tracking-tight">Customer reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">No reviews yet. Be the first to order and review!</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {reviews.map((r) => (
                <li key={r._id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-ink-900">{r.userName}</div>
                    <div className="flex items-center gap-1 text-amber-500"><Star size={14} fill="currentColor" /> {r.rating}</div>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-ink-600">{r.comment}</p>}
                  <div className="mt-2 text-xs text-ink-400">{formatDate(r.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
