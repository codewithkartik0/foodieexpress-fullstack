import { useEffect, useState } from 'react';
import { adminApi } from '../../api/endpoints';
import type { AuditLogEntry } from '../../types';
import { formatDate } from '../../lib/format';

const TYPE_GROUPS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All events' },
  { value: 'auth.login.success', label: 'Login success' },
  { value: 'auth.login.failure', label: 'Login failure' },
  { value: 'auth.login.locked', label: 'Account lockout' },
  { value: 'auth.password.reset.complete', label: 'Password reset' },
  { value: 'authz.denied', label: 'Authorization denied' },
  { value: 'order.create', label: 'Order created' },
  { value: 'order.status.update', label: 'Order status changed' },
  { value: 'payment.succeeded', label: 'Payment succeeded' },
  { value: 'restaurant.approve', label: 'Restaurant approved' },
  { value: 'restaurant.suspend', label: 'Restaurant suspended' },
];

export default function PlatformAuditLogsPage() {
  const [type, setType] = useState('');
  const [outcome, setOutcome] = useState('');
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.auditLogs({ type: type || undefined, outcome: outcome || undefined });
      setItems(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [type, outcome]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Audit logs</h1>
        <p className="text-sm text-ink-500">Append-only record of authentication, authorisation, and admin actions.</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Event type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input w-64">
            {TYPE_GROUPS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Outcome</label>
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="input w-40">
            <option value="">Any</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th>Event</th>
              <th>User</th>
              <th>IP</th>
              <th>Outcome</th>
              <th className="px-4">Meta</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-ink-500">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-ink-500">No events match these filters.</td></tr>
            ) : items.map((e) => (
              <tr key={e._id} className="border-t border-ink-100 align-top">
                <td className="px-4 py-2 text-xs text-ink-500">{formatDate(e.createdAt)}</td>
                <td className="font-mono text-xs">{e.type}</td>
                <td className="text-xs">{e.userId ?? '—'}<div className="text-ink-400">{e.role ?? ''}</div></td>
                <td className="text-xs">{e.ip ?? '—'}</td>
                <td>
                  <span className={e.outcome === 'success' ? 'badge badge-success' : 'badge badge-danger'}>
                    {e.outcome}
                  </span>
                </td>
                <td className="px-4 max-w-md text-xs text-ink-600">
                  <code className="break-all">{JSON.stringify(e.meta)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
