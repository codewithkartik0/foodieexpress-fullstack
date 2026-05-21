import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ordersApi } from '../../api/endpoints';
import type { Order, OrderStatus } from '../../types';
import { formatINR, relativeTime, statusBadgeClass, statusLabel } from '../../lib/format';
import { asMessage } from '../../api/client';

const NEXT_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

export default function RestaurantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.list({ perPage: 50, status: filter === 'all' ? undefined : filter });
      setOrders(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const it = setInterval(load, 20_000);
    return () => clearInterval(it);
  }, [filter]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      await ordersApi.updateStatus(id, status);
      toast.success(`Order ${statusLabel(status)}`);
      await load();
    } catch (e) {
      toast.error(asMessage(e, 'Could not update'));
    }
  };

  const FILTERS: Array<{ v: OrderStatus | 'all'; label: string }> = [
    { v: 'all', label: 'All' },
    { v: 'placed', label: 'Placed' },
    { v: 'accepted', label: 'Accepted' },
    { v: 'preparing', label: 'Preparing' },
    { v: 'out_for_delivery', label: 'Out for delivery' },
    { v: 'delivered', label: 'Delivered' },
    { v: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-ink-500">Manage incoming orders. The list refreshes every 20 seconds.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`badge cursor-pointer ${filter === f.v ? 'bg-brand-500 text-white' : 'badge-neutral'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Placed</th>
              <th className="px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-ink-500">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-ink-500">No orders.</td></tr>
            ) : orders.map((o) => (
              <tr key={o._id} className="border-t border-ink-100 align-top">
                <td className="px-4 py-3">
                  <Link to={`/admin/orders/${o._id}`} className="font-mono font-semibold text-brand-700 hover:underline">
                    #{o.orderNumber}
                  </Link>
                  <div className="text-xs text-ink-500">{o.deliveryAddress.fullName}</div>
                </td>
                <td className="text-xs text-ink-600 max-w-xs">
                  {o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                </td>
                <td className="font-semibold">{formatINR(o.total)}</td>
                <td><span className={statusBadgeClass(o.status)}>{statusLabel(o.status)}</span></td>
                <td className="text-ink-500">{relativeTime(o.createdAt)}</td>
                <td className="px-4">
                  <div className="flex flex-wrap gap-2">
                    {NEXT_TRANSITIONS[o.status].map((next) => (
                      <button
                        key={next}
                        onClick={() => updateStatus(o._id, next)}
                        className={
                          next === 'cancelled'
                            ? 'btn-danger px-3 py-1 text-xs'
                            : 'btn-primary px-3 py-1 text-xs'
                        }
                      >
                        {statusLabel(next)}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
