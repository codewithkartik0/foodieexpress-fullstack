import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Logo';
import { Mail, Phone, ShieldCheck, User as UserIcon } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="container-page py-8 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
      <div className="mt-6 card p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-700">
            <UserIcon size={28} />
          </span>
          <div>
            <div className="text-lg font-bold">{user.fullName}</div>
            <div className="text-sm text-ink-500">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
          <div className="flex items-center gap-3"><Mail size={16} className="text-ink-400" /><span>{user.email}</span></div>
          {user.phone && <div className="flex items-center gap-3"><Phone size={16} className="text-ink-400" /><span>{user.phone}</span></div>}
          <div className="flex items-center gap-3"><ShieldCheck size={16} className="text-ink-400" /><span>Status: {user.status}</span></div>
        </dl>
      </div>

      {user.addresses && user.addresses.length > 0 && (
        <div className="mt-6 card p-6">
          <h2 className="text-lg font-bold">Saved addresses</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {user.addresses.map((a) => (
              <li key={a._id ?? a.line1} className="rounded-lg border border-ink-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{a.label ?? 'Address'}</span>
                  {a.isDefault && <span className="badge badge-success">Default</span>}
                </div>
                <p className="mt-1 text-ink-600">
                  {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <button onClick={logout} className="btn-secondary">Sign out of all devices</button>
      </div>

      <div className="mt-12 flex items-center gap-2 text-xs text-ink-400">
        <Logo to="/" className="opacity-60" />
        Member since {new Date(user.createdAt).toLocaleDateString('en-IN')}
      </div>
    </div>
  );
}
