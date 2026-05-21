import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { ordersApi } from '../../api/endpoints';
import type { Order, OrderStatus } from '../../types';
import { formatDate, formatINR, statusBadgeClass, statusLabel } from '../../lib/format';
import { asMessage } from '../../api/client';

const NEXT_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

export default function RestaurantOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<OrderStatus | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await ordersApi.detail(id);
      setOrder(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const onUpdate = async (next: OrderStatus) => {
    if (!order) return;
    setUpdating(next);
    try {
      const res = await ordersApi.updateStatus(order._id, next);
      setOrder(res.data.data);
      toast.success(`Order ${statusLabel(next)}`);
    } catch (e) {
      toast.error(asMessage(e, 'Could not update'));
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="text-ink-500">Loading...</div>;
  if (!order) return <div className="text-ink-500">Order not found.</div>;

  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
        <ArrowLeft size={14} /> Back to orders
      </Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
        <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
        <span className="text-xs text-ink-500">{formatDate(order.createdAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="text-lg font-bold">Items</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex items-center justify-between border-b border-ink-100 pb-3 last:border-0">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-ink-500">{i.quantity} × {formatINR(i.unitPrice)}</div>
                  </div>
                  <div className="font-semibold">{formatINR(i.unitPrice * i.quantity)}</div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Tax</dt><dd>{formatINR(order.tax)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{formatINR(order.deliveryFee)}</dd></div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold">
                <dt>Total</dt><dd>{formatINR(order.total)}</dd>
              </div>
            </dl>
          </div>

          {NEXT_TRANSITIONS[order.status].length > 0 && (
            <div className="card p-5">
              <h2 className="text-lg font-bold">Update status</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {NEXT_TRANSITIONS[order.status].map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdate(s)}
                    disabled={!!updating}
                    className={s === 'cancelled' ? 'btn-danger' : 'btn-primary'}
                  >
                    {updating === s ? 'Updating...' : statusLabel(s)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <h2 className="text-lg font-bold">Status history</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-700">
              {order.statusHistory.map((s, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <span className={statusBadgeClass(s.status)}>{statusLabel(s.status)}</span>
                  <span className="text-xs text-ink-500">{formatDate(s.at)}</span>
                  {s.note && <span className="text-xs text-ink-500">— {s.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-lg font-bold">Customer</h2>
            <div className="mt-2 text-sm text-ink-700">
              <div>{order.deliveryAddress.fullName}</div>
              <div>{order.deliveryAddress.phone}</div>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="text-lg font-bold">Delivery address</h2>
            <div className="mt-2 text-sm text-ink-700">
              <div>{order.deliveryAddress.line1}</div>
              {order.deliveryAddress.line2 && <div>{order.deliveryAddress.line2}</div>}
              <div>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</div>
            </div>
            {order.notes && <p className="mt-3 rounded bg-ink-50 p-2 text-xs text-ink-600">Note: {order.notes}</p>}
          </div>
          <div className="card p-5">
            <h2 className="text-lg font-bold">Payment</h2>
            <div className="mt-2 text-sm">
              <div>Method: <span className="font-semibold">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card'}</span></div>
              <div>Status: <span className="badge badge-neutral">{order.paymentStatus}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
