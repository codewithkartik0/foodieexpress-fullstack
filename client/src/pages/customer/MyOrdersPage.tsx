import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../api/endpoints';
import type { Order } from '../../types';
import { formatINR, relativeTime, statusBadgeClass, statusLabel } from '../../lib/format';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi
      .list({ perPage: 30 })
      .then((res) => setOrders(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-24 animate-pulse" />)
        ) : orders.length === 0 ? (
          <div className="card p-10 text-center text-ink-500">You haven’t placed any orders yet.</div>
        ) : (
          orders.map((o) => (
            <Link
              key={o._id}
              to={`/orders/${o._id}`}
              className="card flex items-center justify-between gap-4 p-4 hover:border-brand-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold">#{o.orderNumber}</span>
                  <span className={statusBadgeClass(o.status)}>{statusLabel(o.status)}</span>
                </div>
                <div className="mt-1 text-sm text-ink-500 line-clamp-1">
                  {o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                </div>
                <div className="mt-1 text-xs text-ink-400">{relativeTime(o.createdAt)}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{formatINR(o.total)}</div>
                <div className="text-xs text-ink-500">{o.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card'}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
