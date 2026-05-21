import { UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={clsx('group flex items-center gap-2 text-ink-900', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white shadow-soft transition group-hover:bg-brand-600">
        <UtensilsCrossed size={20} />
      </span>
      <span className="text-lg font-extrabold tracking-tight">
        Foodie<span className="text-brand-500">Express</span>
      </span>
    </Link>
  );
}
