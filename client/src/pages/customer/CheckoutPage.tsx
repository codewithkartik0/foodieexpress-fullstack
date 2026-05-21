import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { CreditCard, Wallet, Loader2 } from 'lucide-react';
import { ordersApi, paymentsApi } from '../../api/endpoints';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/format';
import { asMessage } from '../../api/client';
import { StripeCheckoutSection } from '../../components/StripeCheckoutSection';

interface CheckoutForm {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  notes?: string;
  paymentMethod: 'stripe' | 'cod';
}

export default function CheckoutPage() {
  const { cart, refresh: refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingClientSecret, setPendingClientSecret] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  const defaultAddr = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CheckoutForm>({
    defaultValues: {
      fullName: user?.fullName ?? '',
      phone: user?.phone ?? '',
      line1: defaultAddr?.line1 ?? '',
      line2: defaultAddr?.line2 ?? '',
      city: defaultAddr?.city ?? '',
      state: defaultAddr?.state ?? '',
      postalCode: defaultAddr?.postalCode ?? '',
      paymentMethod: 'stripe',
    },
  });

  useEffect(() => {
    if (cart.items.length === 0 && !pendingOrderId) {
      navigate('/cart', { replace: true });
    }
  }, [cart.items.length, pendingOrderId, navigate]);

  const paymentMethod = watch('paymentMethod');

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const placed = await ordersApi.place({
        paymentMethod: values.paymentMethod,
        deliveryAddress: {
          fullName: values.fullName,
          phone: values.phone,
          line1: values.line1,
          line2: values.line2,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode,
          country: 'IN',
        },
        notes: values.notes,
      });
      const order = placed.data.data;
      await refreshCart();

      if (values.paymentMethod === 'cod') {
        toast.success('Order placed! Pay on delivery.');
        navigate(`/orders/${order._id}`);
        return;
      }

      // Stripe path: create PaymentIntent and show inline payment section
      const intent = await paymentsApi.createIntent(order._id);
      setPendingOrderId(order._id);
      setPendingClientSecret(intent.data.data.clientSecret);
      setPendingPaymentId(intent.data.data.paymentId);
      setStripeConfigured(intent.data.data.stripeConfigured);
    } catch (e) {
      toast.error(asMessage(e, 'Could not place order'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold">Delivery address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Full name</label>
                <input className="input" {...register('fullName', { required: 'Required' })} />
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" {...register('phone', { required: 'Required', pattern: { value: /^[0-9]{10}$/, message: '10 digits' } })} />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="label">Postal code</label>
                <input className="input" {...register('postalCode', { required: 'Required', pattern: { value: /^[0-9]{6}$/, message: '6 digits' } })} />
                {errors.postalCode && <p className="mt-1 text-xs text-red-600">{errors.postalCode.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address line 1</label>
                <input className="input" {...register('line1', { required: 'Required' })} />
                {errors.line1 && <p className="mt-1 text-xs text-red-600">{errors.line1.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address line 2 (optional)</label>
                <input className="input" {...register('line2')} />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" {...register('city', { required: 'Required' })} />
              </div>
              <div>
                <label className="label">State</label>
                <input className="input" {...register('state', { required: 'Required' })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notes (optional)</label>
                <textarea className="input min-h-[80px]" placeholder="Any special instructions?" {...register('notes')} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold">Payment method</h2>
            <div className="mt-4 grid gap-3">
              <label className="card flex cursor-pointer items-center gap-3 p-4 hover:border-brand-300">
                <input type="radio" value="stripe" {...register('paymentMethod')} className="accent-brand-500" />
                <CreditCard size={18} className="text-brand-500" />
                <div className="flex-1">
                  <div className="font-semibold">Pay with card (Stripe)</div>
                  <div className="text-xs text-ink-500">Visa, Mastercard, RuPay, UPI. Secure encrypted checkout.</div>
                </div>
              </label>
              <label className="card flex cursor-pointer items-center gap-3 p-4 hover:border-brand-300">
                <input type="radio" value="cod" {...register('paymentMethod')} className="accent-brand-500" />
                <Wallet size={18} className="text-brand-500" />
                <div className="flex-1">
                  <div className="font-semibold">Cash on Delivery</div>
                  <div className="text-xs text-ink-500">Pay with cash to the delivery agent.</div>
                </div>
              </label>
            </div>
          </div>

          {!pendingClientSecret && (
            <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {paymentMethod === 'stripe' ? 'Continue to payment' : 'Place order'}
            </button>
          )}
        </form>

        <aside className="card h-max p-5">
          <h2 className="text-lg font-bold">Order summary</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {cart.items.map((it) => (
              <li key={it._id} className="flex justify-between">
                <span className="line-clamp-1">{it.name} × {it.quantity}</span>
                <span>{formatINR(it.unitPrice * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <hr className="my-4 border-ink-100" />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(cart.pricing.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Tax</dt><dd>{formatINR(cart.pricing.tax)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{cart.pricing.deliveryFee === 0 ? 'FREE' : formatINR(cart.pricing.deliveryFee)}</dd></div>
            <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-bold">
              <dt>Total</dt><dd>{formatINR(cart.pricing.total)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {pendingClientSecret && pendingOrderId && pendingPaymentId && (
        <div className="mt-8 max-w-xl">
          <StripeCheckoutSection
            orderId={pendingOrderId}
            clientSecret={pendingClientSecret}
            paymentId={pendingPaymentId}
            stripeConfigured={stripeConfigured}
            onSuccess={() => {
              toast.success('Payment successful!');
              navigate(`/orders/${pendingOrderId}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
