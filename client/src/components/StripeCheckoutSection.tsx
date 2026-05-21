import { useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import { paymentsApi } from '../api/endpoints';
import { asMessage } from '../api/client';

interface Props {
  orderId: string;
  clientSecret: string;
  paymentId: string;
  stripeConfigured: boolean;
  onSuccess: () => void;
}

export function StripeCheckoutSection({ orderId, clientSecret, paymentId, stripeConfigured, onSuccess }: Props) {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

  const stripePromise = useMemo<Promise<Stripe | null> | null>(() => {
    if (!stripeConfigured || !publishableKey || publishableKey.includes('replace_me')) return null;
    return loadStripe(publishableKey);
  }, [stripeConfigured, publishableKey]);

  if (!stripePromise) {
    // Dev mock mode
    return (
      <DevMockCheckout paymentId={paymentId} onSuccess={onSuccess} orderId={orderId} />
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <RealStripeForm onSuccess={onSuccess} />
    </Elements>
  );
}

function RealStripeForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });
      if (result.error) {
        toast.error(result.error.message ?? 'Payment failed');
      } else if (result.paymentIntent?.status === 'succeeded') {
        onSuccess();
      } else {
        toast('Awaiting payment confirmation...');
      }
    } catch (err) {
      toast.error(asMessage(err, 'Payment failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <ShieldCheck size={18} className="text-brand-500" />
        Secure payment
      </h2>
      <PaymentElement />
      <button type="submit" disabled={!stripe || submitting} className="btn-primary w-full">
        {submitting && <Loader2 size={16} className="animate-spin" />}
        Pay now
      </button>
      <p className="text-xs text-ink-500">
        Card processing handled by Stripe. Your card details never touch our servers.
      </p>
    </form>
  );
}

function DevMockCheckout({ paymentId, onSuccess, orderId }: { paymentId: string; onSuccess: () => void; orderId: string }) {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // small UX touch: focus the demo button
  }, []);

  const onPay = async () => {
    setSubmitting(true);
    try {
      await paymentsApi.devMarkPaid(paymentId);
      onSuccess();
    } catch (err) {
      toast.error(asMessage(err, 'Could not mark as paid'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <ShieldCheck size={18} className="text-amber-500" /> Stripe (development mode)
      </h2>
      <p className="mt-2 text-sm text-ink-600">
        The backend is running without a Stripe API key. In a real deployment, you would see Stripe’s
        secure card form here. For demo purposes, click the button below to simulate a successful payment.
      </p>
      <p className="mt-1 text-xs text-ink-500">Order ID: <span className="font-mono">{orderId.slice(-8).toUpperCase()}</span></p>
      <button onClick={onPay} disabled={submitting} className="btn-primary mt-4 w-full">
        {submitting && <Loader2 size={16} className="animate-spin" />}
        Simulate successful payment
      </button>
    </div>
  );
}
