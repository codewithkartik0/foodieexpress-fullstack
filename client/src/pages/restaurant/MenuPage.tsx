import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { menuItemsApi, restaurantsApi } from '../../api/endpoints';
import type { MenuItem, Restaurant } from '../../types';
import { formatINR } from '../../lib/format';
import { asMessage } from '../../api/client';
import { useForm } from 'react-hook-form';

interface MenuItemForm {
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isVeg: boolean;
  available: boolean;
}

export default function RestaurantMenuPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([restaurantsApi.myRestaurant(), menuItemsApi.myMenu()]);
      setRestaurant(r.data.data);
      setItems(m.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await menuItemsApi.remove(id);
      toast.success('Deleted');
      await load();
    } catch (e) {
      toast.error(asMessage(e));
    }
  };

  const onToggleAvailable = async (item: MenuItem) => {
    try {
      await menuItemsApi.update(item._id, { available: !item.available });
      await load();
    } catch (e) {
      toast.error(asMessage(e));
    }
  };

  if (loading) return <div className="text-ink-500">Loading...</div>;

  if (!restaurant) {
    return (
      <div className="card p-8 text-center">
        Please create your restaurant profile first in the “Restaurant” section.
      </div>
    );
  }

  // Group by category
  const groups: Record<string, MenuItem[]> = {};
  for (const it of items) {
    groups[it.category] = groups[it.category] ?? [];
    groups[it.category].push(it);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
          <p className="text-sm text-ink-500">{items.length} items across {Object.keys(groups).length} categories</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">
          <Plus size={16} /> Add item
        </button>
      </header>

      {showForm && (
        <MenuItemForm
          item={editing}
          restaurantId={restaurant._id}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSaved={async () => { setShowForm(false); setEditing(null); await load(); }}
        />
      )}

      {Object.entries(groups).map(([category, list]) => (
        <section key={category}>
          <h2 className="text-lg font-bold">{category}</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {list.map((it) => (
              <div key={it._id} className="card flex items-start gap-4 p-4">
                {it.imageUrl && (
                  <img src={it.imageUrl} alt={it.name} className="h-20 w-20 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{it.name}</h3>
                    <span className={it.isVeg ? 'badge badge-success' : 'badge badge-warning'}>{it.isVeg ? 'Veg' : 'Non-veg'}</span>
                  </div>
                  {it.description && <p className="text-sm text-ink-500 line-clamp-2">{it.description}</p>}
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="font-semibold">{formatINR(it.price)}</span>
                    <button
                      onClick={() => onToggleAvailable(it)}
                      className={it.available ? 'badge badge-success' : 'badge badge-danger'}
                    >
                      {it.available ? 'Available' : 'Unavailable'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { setEditing(it); setShowForm(true); }} className="btn-ghost p-2"><Pencil size={16} /></button>
                  <button onClick={() => onDelete(it._id)} className="btn-ghost p-2 text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {items.length === 0 && (
        <div className="card p-10 text-center text-ink-500">
          No menu items yet. Add your first item to get started.
        </div>
      )}
    </div>
  );
}

function MenuItemForm({
  item,
  restaurantId,
  onCancel,
  onSaved,
}: {
  item: MenuItem | null;
  restaurantId: string;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MenuItemForm>({
    defaultValues: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      price: item?.price ?? 0,
      category: item?.category ?? '',
      imageUrl: item?.imageUrl ?? '',
      isVeg: item?.isVeg ?? true,
      available: item?.available ?? true,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (item) {
        await menuItemsApi.update(item._id, values);
        toast.success('Item updated');
      } else {
        await menuItemsApi.create({ ...values, restaurantId });
        toast.success('Item added');
      }
      await onSaved();
    } catch (e) {
      toast.error(asMessage(e));
    }
  });

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">{item ? 'Edit item' : 'Add menu item'}</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Name</label>
          <input className="input" {...register('name', { required: 'Required', minLength: 2 })} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Category</label>
          <input className="input" placeholder="e.g. Starters" {...register('category', { required: 'Required' })} />
          {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
        </div>
        <div>
          <label className="label">Price (INR)</label>
          <input type="number" min={0} step="0.01" className="input" {...register('price', { required: true, valueAsNumber: true, min: 0 })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea rows={2} className="input" {...register('description')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Image URL (optional)</label>
          <input className="input" placeholder="https://..." {...register('imageUrl')} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isVeg')} className="accent-brand-500" /> Vegetarian
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('available')} className="accent-brand-500" /> Available
        </label>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : item ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </form>
    </div>
  );
}
