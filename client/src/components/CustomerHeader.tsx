import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, ShoppingBag, User as UserIcon, Menu as MenuIcon } from 'lucide-react';
import { useState } from 'react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { clsx } from 'clsx';

export function CustomerHeader() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const cartCount = cart.items.reduce((acc, i) => acc + i.quantity, 0);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-700">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'text-brand-500' : 'hover:text-ink-900')}>
              Home
            </NavLink>
            <NavLink to="/restaurants" className={({ isActive }) => (isActive ? 'text-brand-500' : 'hover:text-ink-900')}>
              Restaurants
            </NavLink>
            {user?.role === 'customer' && (
              <NavLink to="/orders" className={({ isActive }) => (isActive ? 'text-brand-500' : 'hover:text-ink-900')}>
                My Orders
              </NavLink>
            )}
            {user?.role === 'restaurant' && (
              <NavLink to="/admin" className={({ isActive }) => (isActive ? 'text-brand-500' : 'hover:text-ink-900')}>
                Restaurant Panel
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/platform" className={({ isActive }) => (isActive ? 'text-brand-500' : 'hover:text-ink-900')}>
                Platform Admin
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'customer' && (
            <Link to="/cart" className="relative btn-ghost p-2" aria-label="Cart">
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/profile" className="btn-ghost"><UserIcon size={16}/> {user.fullName.split(' ')[0]}</Link>
              <button onClick={onLogout} className="btn-secondary"><LogOut size={16}/> Sign out</button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="btn-ghost"><LogIn size={16}/> Sign in</Link>
              <Link to="/register" className="btn-primary">Get started</Link>
            </div>
          )}
          <button className="md:hidden btn-ghost p-2" onClick={() => setOpen((v) => !v)} aria-label="menu">
            <MenuIcon size={20} />
          </button>
        </div>
      </div>
      <div
        className={clsx(
          'md:hidden border-t border-ink-100 bg-white transition-[max-height] overflow-hidden',
          open ? 'max-h-96' : 'max-h-0',
        )}
      >
        <nav className="container-page py-4 grid gap-1 text-sm">
          <NavLink onClick={() => setOpen(false)} to="/" end className="rounded-lg px-3 py-2 hover:bg-ink-100">Home</NavLink>
          <NavLink onClick={() => setOpen(false)} to="/restaurants" className="rounded-lg px-3 py-2 hover:bg-ink-100">Restaurants</NavLink>
          {user?.role === 'customer' && <NavLink onClick={() => setOpen(false)} to="/orders" className="rounded-lg px-3 py-2 hover:bg-ink-100">My Orders</NavLink>}
          {user?.role === 'restaurant' && <NavLink onClick={() => setOpen(false)} to="/admin" className="rounded-lg px-3 py-2 hover:bg-ink-100">Restaurant Panel</NavLink>}
          {user?.role === 'admin' && <NavLink onClick={() => setOpen(false)} to="/platform" className="rounded-lg px-3 py-2 hover:bg-ink-100">Platform Admin</NavLink>}
          {user ? (
            <>
              <NavLink onClick={() => setOpen(false)} to="/profile" className="rounded-lg px-3 py-2 hover:bg-ink-100">Profile</NavLink>
              <button onClick={async () => { await onLogout(); setOpen(false); }} className="rounded-lg px-3 py-2 text-left hover:bg-ink-100">Sign out</button>
            </>
          ) : (
            <>
              <NavLink onClick={() => setOpen(false)} to="/login" className="rounded-lg px-3 py-2 hover:bg-ink-100">Sign in</NavLink>
              <NavLink onClick={() => setOpen(false)} to="/register" className="rounded-lg px-3 py-2 bg-brand-500 text-white">Create account</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
