import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export const allCuisines = [
  'Indian',
  'Pizza',
  'Italian',
  'Chinese',
  'Sushi',
  'Japanese',
  'Burgers',
  'Mexican',
  'Desserts',
  'Healthy',
];

const palettes: Record<string, string> = {
  Indian: 'from-amber-200 to-amber-300 text-amber-900',
  Pizza: 'from-rose-200 to-rose-300 text-rose-900',
  Italian: 'from-emerald-200 to-emerald-300 text-emerald-900',
  Chinese: 'from-red-200 to-red-300 text-red-900',
  Sushi: 'from-blue-200 to-blue-300 text-blue-900',
  Japanese: 'from-blue-100 to-blue-200 text-blue-900',
  Burgers: 'from-orange-200 to-orange-300 text-orange-900',
  Mexican: 'from-yellow-200 to-yellow-300 text-yellow-900',
  Desserts: 'from-pink-200 to-pink-300 text-pink-900',
  Healthy: 'from-lime-200 to-lime-300 text-lime-900',
};

export function CuisineChips({
  cuisines,
  className,
  linkPrefix = '/restaurants',
}: {
  cuisines: string[];
  className?: string;
  linkPrefix?: string;
}) {
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {cuisines.map((c) => (
        <Link
          key={c}
          to={`${linkPrefix}?cuisine=${encodeURIComponent(c)}`}
          className={clsx(
            'rounded-full bg-gradient-to-br px-4 py-2 text-sm font-semibold shadow-soft transition hover:-translate-y-0.5',
            palettes[c] ?? 'from-ink-100 to-ink-200 text-ink-700',
          )}
        >
          {c}
        </Link>
      ))}
    </div>
  );
}
