import { ReactNode, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu as MenuIcon, X } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';

export interface AdminNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

interface Props {
  navItems: AdminNavItem[];
  title: string;
}

export function AdminLayout({ navItems, title }: Props) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-64 transform border-r border-ink-100 bg-white p-4 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <Logo to="/" />
          <button onClick={() => setOpen(false)} className="lg:hidden btn-ghost p-2"><X size={18} /></button>
        </div>
        <p className="mt-1 text-xs text-ink-500">{title}</p>
        <nav className="mt-6 space-y-1">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-brand-500 text-white' : 'text-ink-700 hover:bg-ink-100',
                )
              }
            >
              {it.icon}
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-4 bottom-4">
          <div className="card flex items-center justify-between p-3">
            <div className="text-sm">
              <div className="font-semibold">{user?.fullName}</div>
              <div className="text-xs text-ink-500">{user?.email}</div>
            </div>
            <button onClick={onLogout} className="btn-ghost p-2" aria-label="logout"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-100 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="btn-ghost p-2"><MenuIcon size={20} /></button>
          <Logo />
          <Link to="/" className="text-xs text-ink-500">View site</Link>
        </div>
        <main className="px-4 py-6 sm:px-6 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
