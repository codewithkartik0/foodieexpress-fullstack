import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatINR } from '../../lib/format';
import toast from 'react-hot-toast';
import { asMessage } from '../../api/client';

export default function CartPage() {
  const { cart, updateItem, removeItem, clear } = useCart();

  const onChangeQty = async (itemId: string, qty: number) => {
    try {
      await updateItem(itemId, qty);
    } catch (e) {
      toast.error(asMessage(e, 'Could not update cart'));
    }
  };

  const onRemove = async (itemId: string) => {
    try {
      await removeItem(itemId);
    } catch (e) {
      toast.error(asMessage(e, 'Could not remove item'));
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-ink-300" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-ink-500">Browse restaurants and add some delicious items.</p>
        <Link to="/restaurants" className="btn-primary mt-6 inline-flex">Browse restaurants</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold tracking-tight">Your cart</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {cart.items.map((it) => (
            <div key={it._id} className="card flex items-center gap-4 p-4">
              {it.imageUrl && <img src={it.imageUrl} alt={it.name} className="h-16 w-16 rounded-lg object-cover" />}
              <div className="flex-1">
                <div className="font-semibold text-ink-900">{it.name}</div>
                <div className="text-sm text-ink-500">{formatINR(it.unitPrice)} each</div>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg border border-ink-200 p-1">
                <button
                  onClick={() => it._id && onChangeQty(it._id, it.quantity - 1)}
                  className="grid h-7 w-7 place-items-center rounded-md hover:bg-ink-100"
                  aria-label="decrease"
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{it.quantity}</span>
                <button
                  onClick={() => it._id && onChangeQty(it._id, it.quantity + 1)}
                  className="grid h-7 w-7 place-items-center rounded-md hover:bg-ink-100"
                  aria-label="increase"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="w-24 text-right font-semibold">{formatINR(it.unitPrice * it.quantity)}</div>
              <button
                onClick={() => it._id && onRemove(it._id)}
                className="btn-ghost p-2 text-ink-500"
                aria-label="remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button onClick={() => clear()} className="text-sm text-ink-500 hover:text-red-600 underline-offset-2 hover:underline">
            Clear cart
          </button>
        </div>

        <aside className="card h-max p-5">
          <h2 className="text-lg font-bold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(cart.pricing.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Tax (5% GST)</dt><dd>{formatINR(cart.pricing.tax)}</dd></div>
            <div className="flex justify-between"><dt>Delivery fee</dt>
              <dd>
                {cart.pricing.deliveryFee === 0 ? <span className="text-emerald-600">FREE</span> : formatINR(cart.pricing.deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-bold">
              <dt>Total</dt><dd>{formatINR(cart.pricing.total)}</dd>
            </div>
          </dl>
          <Link to="/checkout" className="btn-primary mt-5 w-full">Proceed to checkout</Link>
          <p className="mt-3 text-xs text-ink-500">
            Free delivery on orders above ₹499. Cash on Delivery and card payments supported.
          </p>
        </aside>
      </div>
    </div>
  );
}
