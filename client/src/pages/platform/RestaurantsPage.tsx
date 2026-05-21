import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Pause, RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import type { Restaurant } from '../../types';
import { asMessage } from '../../api/client';

const TABS: Array<{ v: 'pending' | 'approved' | 'suspended' | 'all'; label: string }> = [
  { v: 'pending', label: 'Pending approval' },
  { v: 'approved', label: 'Approved' },
  { v: 'suspended', label: 'Suspended' },
  { v: 'all', label: 'All' },
];

export default function PlatformRestaurantsPage() {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'suspended' | 'all'>('pending');
  const [items, setItems] = useState<Restaurant[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listRestaurants({ status: filter, q: q || undefined, perPage: 50 });
      setItems(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [filter]);

  const onApprove = async (id: string) => {
    setBusy(id);
    try {
      await adminApi.setApproval(id, 'approve');
      toast.success('Approved');
      await load();
    } catch (e) {
      toast.error(asMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const onSuspend = async (id: string) => {
    if (!window.confirm('Suspend this restaurant?')) return;
    setBusy(id);
    try {
      await adminApi.setApproval(id, 'suspend');
      toast.success('Suspended');
      await load();
    } catch (e) {
      toast.error(asMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const onReactivate = async (id: string) => {
    setBusy(id);
    try {
      await adminApi.setApproval(id, 'reactivate');
      toast.success('Reactivated');
      await load();
    } catch (e) {
      toast.error(asMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Restaurants</h1>
        <p className="text-sm text-ink-500">Approve, suspend, or reactivate restaurants on the platform.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.v}
              onClick={() => setFilter(t.v)}
              className={`badge cursor-pointer ${filter === t.v ? 'bg-brand-500 text-white' : 'badge-neutral'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); load(); }}
          className="ml-auto flex gap-2"
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or city" className="input w-64" />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
            <tr>
              <th className="px-4 py-3">Restaurant</th>
              <th>Owner</th>
              <th>City</th>
              <th>Status</th>
              <th className="px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-ink-500">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-ink-500">No restaurants.</td></tr>
            ) : items.map((r) => {
              const ownerName = typeof r.ownerId === 'object' ? r.ownerId.fullName : '';
              const ownerEmail = typeof r.ownerId === 'object' ? r.ownerId.email : '';
              return (
                <tr key={r._id} className="border-t border-ink-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-ink-500">{r.cuisine.join(' · ')}</div>
                  </td>
                  <td>
                    <div>{ownerName ?? '—'}</div>
                    <div className="text-xs text-ink-500">{ownerEmail}</div>
                  </td>
                  <td>{r.address.city}</td>
                  <td>
                    <span
                      className={
                        r.approvalStatus === 'approved'
                          ? 'badge badge-success'
                          : r.approvalStatus === 'suspended'
                            ? 'badge badge-danger'
                            : 'badge badge-warning'
                      }
                    >
                      {r.approvalStatus}
                    </span>
                  </td>
                  <td className="px-4">
                    <div className="flex gap-2">
                      {r.approvalStatus === 'pending' && (
                        <button
                          onClick={() => onApprove(r._id)}
                          disabled={busy === r._id}
                          className="btn-primary px-3 py-1 text-xs"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                      )}
                      {r.approvalStatus === 'approved' && (
                        <button
                          onClick={() => onSuspend(r._id)}
                          disabled={busy === r._id}
                          className="btn-danger px-3 py-1 text-xs"
                        >
                          <Pause size={14} /> Suspend
                        </button>
                      )}
                      {r.approvalStatus === 'suspended' && (
                        <button
                          onClick={() => onReactivate(r._id)}
                          disabled={busy === r._id}
                          className="btn-primary px-3 py-1 text-xs"
                        >
                          <RefreshCw size={14} /> Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
