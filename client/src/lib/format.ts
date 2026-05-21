export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function formatDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function relativeTime(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString('en-IN');
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'placed':
      return 'badge-info';
    case 'accepted':
    case 'preparing':
      return 'badge-warning';
    case 'out_for_delivery':
      return 'badge-info';
    case 'delivered':
      return 'badge-success';
    case 'cancelled':
      return 'badge-danger';
    default:
      return 'badge-neutral';
  }
}
