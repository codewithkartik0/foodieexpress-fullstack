import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, ShoppingBag, Wallet, Star } from 'lucide-react';
import { restaurantAdminApi, RestaurantStats } from '../../api/endpoints';
import { formatINR, relativeTime, statusBadgeClass, statusLabel } from '../../lib/format';

export default function RestaurantDashboardPage() {
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restaurantAdminApi.stats().then((res) => setStats(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-ink-500">Loading...</div>;

  if (!stats?.hasRestaurant) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome!</h1>
        <p className="mt-3 text-ink-600">
          You haven’t set up your restaurant yet. Get started by creating your restaurant profile.
        </p>
        <Link to="/admin/restaurant" className="btn-primary mt-6 inline-flex">Create restaurant</Link>
      </div>
    );
  }

  const r = stats.restaurant!;
  const today = stats.today!;
  const totals = stats.totals!;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{r.name}</h1>
        <p className="text-sm text-ink-500">Welcome back. Here’s how things are going today.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<ShoppingBag size={20} />} label="Today's orders" value={today.orders.toString()} />
        <KpiCard icon={<Wallet size={20} />} label="Today's revenue" value={formatINR(today.revenue)} />
        <KpiCard icon={<TrendingUp size={20} />} label="Total orders" value={totals.orders.toString()} />
        <KpiCard icon={<Star size={20} />} label="Rating" value={`${r.rating.toFixed(1)} (${r.ratingCount})`} accent="bg-amber-100 text-amber-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2 p-5">
          <h2 className="text-lg font-bold">Last 7 days revenue</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={stats.last7Days ?? []} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatINR(Number(v))} />
                <Line type="monotone" dataKey="total" stroke="#f15a14" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold">Top items</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {(stats.topItems ?? []).map((it) => (
              <li key={it._id} className="flex items-center justify-between">
                <span className="line-clamp-1">{it.name}</span>
                <span className="font-semibold">{it.quantity} sold</span>
              </li>
            ))}
            {(!stats.topItems || stats.topItems.length === 0) && (
              <p className="text-ink-500">No data yet.</p>
            )}
          </ul>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent orders</h2>
          <Link to="/admin/orders" className="text-sm font-semibold text-brand-600">View all →</Link>
        </div>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase text-ink-500">
            <tr>
              <th className="py-2">Order</th>
              <th>Status</th>
              <th>Total</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {(stats.recentOrders ?? []).map((o) => (
              <tr key={o._id} className="border-t border-ink-100">
                <td className="py-2">
                  <Link to={`/admin/orders/${o._id}`} className="font-mono font-semibold text-brand-700 hover:underline">
                    #{o.orderNumber}
                  </Link>
                </td>
                <td><span className={statusBadgeClass(o.status)}>{statusLabel(o.status)}</span></td>
                <td className="font-semibold">{formatINR(o.total)}</td>
                <td className="text-ink-500">{relativeTime(o.createdAt)}</td>
              </tr>
            ))}
            {(stats.recentOrders ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-ink-500">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${accent ?? 'bg-brand-100 text-brand-600'}`}>
          {icon}
        </span>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-500">{label}</div>
          <div className="text-xl font-extrabold">{value}</div>
        </div>
      </div>
    </div>
  );
}
