import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CircleDashed, CheckCircle2, XCircle, Star } from 'lucide-react';
import { ordersApi, reviewsApi } from '../../api/endpoints';
import type { Order, OrderStatus } from '../../types';
import { formatDate, formatINR, statusBadgeClass, statusLabel } from '../../lib/format';
import { asMessage } from '../../api/client';

const TIMELINE: OrderStatus[] = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitReview, setSubmitReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await ordersApi.detail(id);
      setOrder(res.data.data);
      setReviewSubmitted(!!res.data.data.reviewId);
    } catch (e) {
      toast.error(asMessage(e, 'Could not load order'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Poll every 15s while order is in progress
    const it = setInterval(load, 15_000);
    return () => clearInterval(it);
  }, [id]);

  const onCancel = async () => {
    if (!order) return;
    if (!window.confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await ordersApi.cancel(order._id);
      setOrder(res.data.data);
      toast.success('Order cancelled');
    } catch (e) {
      toast.error(asMessage(e, 'Could not cancel'));
    } finally {
      setCancelling(false);
    }
  };

  const onSubmitReview = async () => {
    if (!order) return;
    setSubmitReview(true);
    try {
      await reviewsApi.create({ orderId: order._id, rating, comment });
      setReviewSubmitted(true);
      toast.success('Thanks for your review!');
    } catch (e) {
      toast.error(asMessage(e, 'Could not save review'));
    } finally {
      setSubmitReview(false);
    }
  };

  if (loading) return <div className="container-page py-12 text-ink-500">Loading...</div>;
  if (!order) return <div className="container-page py-12 text-ink-500">Order not found.</div>;

  const stageIndex = TIMELINE.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
        <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
        <span className="text-xs text-ink-500">Placed {formatDate(order.createdAt)}</span>
      </div>

      {/* Timeline */}
      <div className="mt-8 grid gap-3 sm:grid-cols-5">
        {TIMELINE.map((s, idx) => {
          const reached = !isCancelled && stageIndex >= idx;
          const active = !isCancelled && stageIndex === idx;
          return (
            <div key={s} className={`card flex items-center gap-3 p-3 ${active ? 'border-brand-300' : ''}`}>
              {isCancelled ? (
                <XCircle className="text-red-500" size={20} />
              ) : reached ? (
                <CheckCircle2 className="text-emerald-500" size={20} />
              ) : (
                <CircleDashed className="text-ink-300" size={20} />
              )}
              <div className="text-sm font-semibold capitalize">{statusLabel(s)}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
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

          {(order.status === 'placed' || order.status === 'accepted') && (
            <button onClick={onCancel} disabled={cancelling} className="btn-danger">
              {cancelling ? 'Cancelling...' : 'Cancel order'}
            </button>
          )}

          {order.status === 'delivered' && !reviewSubmitted && (
            <div className="card p-5">
              <h2 className="text-lg font-bold">Leave a review</h2>
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={n <= rating ? 'text-amber-500' : 'text-ink-300'}
                    aria-label={`${n} stars`}
                  >
                    <Star size={28} fill="currentColor" />
                  </button>
                ))}
              </div>
              <textarea
                className="input mt-3 min-h-[80px]"
                placeholder="Tell us how it was..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button onClick={onSubmitReview} disabled={submitReview} className="btn-primary mt-3">
                {submitReview ? 'Submitting...' : 'Submit review'}
              </button>
            </div>
          )}

          {reviewSubmitted && order.status === 'delivered' && (
            <div className="card p-5 text-sm text-ink-600">
              Thanks — your review has been recorded.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-lg font-bold">Delivery address</h2>
            <div className="mt-2 text-sm text-ink-700">
              <div>{order.deliveryAddress.fullName} · {order.deliveryAddress.phone}</div>
              <div>{order.deliveryAddress.line1}</div>
              {order.deliveryAddress.line2 && <div>{order.deliveryAddress.line2}</div>}
              <div>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</div>
            </div>
            {order.notes && (
              <p className="mt-3 rounded bg-ink-50 p-2 text-xs text-ink-600">Note: {order.notes}</p>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-bold">Payment</h2>
            <div className="mt-2 text-sm">
              <div>Method: <span className="font-semibold">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card (Stripe)'}</span></div>
              <div>Status: <span className="badge badge-neutral">{order.paymentStatus}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
