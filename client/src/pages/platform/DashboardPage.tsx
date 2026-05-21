import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, Building2, ShoppingBag, Wallet } from 'lucide-react';
import { adminApi, PlatformStats } from '../../api/endpoints';
import { formatINR, relativeTime, statusBadgeClass, statusLabel } from '../../lib/format';

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.platformStats().then((res) => setStats(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <div className="text-ink-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
        <p className="text-sm text-ink-500">Cross-restaurant statistics and recent activity.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users size={20} />} label="Customers" value={stats.counts.customers.toString()} />
        <Kpi icon={<Building2 size={20} />} label="Restaurants" value={`${stats.counts.restaurants} (${stats.counts.pendingRestaurants} pending)`} />
        <Kpi icon={<ShoppingBag size={20} />} label="Total orders" value={stats.counts.orders.toString()} />
        <Kpi icon={<Wallet size={20} />} label="Revenue" value={formatINR(stats.revenue.total)} accent="bg-emerald-100 text-emerald-700" />
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-bold">Last 7 days</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <BarChart data={stats.revenue.last7Days} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatINR(Number(v))} />
              <Bar dataKey="total" fill="#f15a14" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Latest orders</h2>
          <Link to="/platform/restaurants" className="text-sm font-semibold text-brand-600">Manage restaurants →</Link>
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
            {stats.recentOrders.map((o) => (
              <tr key={o._id} className="border-t border-ink-100">
                <td className="py-2 font-mono">#{o.orderNumber}</td>
                <td><span className={statusBadgeClass(o.status)}>{statusLabel(o.status)}</span></td>
                <td className="font-semibold">{formatINR(o.total)}</td>
                <td className="text-ink-500">{relativeTime(o.createdAt)}</td>
              </tr>
            ))}
            {stats.recentOrders.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-ink-500">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
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
