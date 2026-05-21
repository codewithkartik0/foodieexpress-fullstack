import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { restaurantsApi } from '../../api/endpoints';
import type { Restaurant } from '../../types';
import { asMessage } from '../../api/client';

interface SettingsForm {
  name: string;
  description?: string;
  cuisine: string; // comma separated
  costForTwo: number;
  coverImage?: string;
  imageList?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export default function RestaurantSettingsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SettingsForm>();

  const load = async () => {
    setLoading(true);
    const res = await restaurantsApi.myRestaurant();
    setRestaurant(res.data.data);
    if (res.data.data) {
      reset({
        name: res.data.data.name,
        description: res.data.data.description ?? '',
        cuisine: (res.data.data.cuisine ?? []).join(', '),
        costForTwo: res.data.data.costForTwo,
        coverImage: res.data.data.coverImage ?? '',
        imageList: (res.data.data.images ?? []).join('\n'),
        line1: res.data.data.address.line1,
        line2: res.data.data.address.line2 ?? '',
        city: res.data.data.address.city,
        state: res.data.data.address.state,
        postalCode: res.data.data.address.postalCode,
      });
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const onSubmit = handleSubmit(async (values) => {
    const payload: Partial<Restaurant> = {
      name: values.name,
      description: values.description,
      cuisine: values.cuisine.split(',').map((s) => s.trim()).filter(Boolean),
      costForTwo: Number(values.costForTwo),
      coverImage: values.coverImage,
      images: (values.imageList ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
      address: {
        line1: values.line1,
        line2: values.line2,
        city: values.city,
        state: values.state,
        postalCode: values.postalCode,
        country: 'IN',
      },
    };

    try {
      if (restaurant) {
        await restaurantsApi.update(restaurant._id, payload);
        toast.success('Restaurant updated');
      } else {
        await restaurantsApi.create(payload);
        toast.success('Restaurant created. Awaiting admin approval.');
      }
      await load();
    } catch (e) {
      toast.error(asMessage(e));
    }
  });

  if (loading) return <div className="text-ink-500">Loading...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Restaurant settings</h1>
        <p className="text-sm text-ink-500">
          {restaurant
            ? `Status: ${restaurant.approvalStatus}`
            : 'Set up your restaurant to start receiving orders.'}
        </p>
      </header>

      <form onSubmit={onSubmit} className="card grid gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Restaurant name</label>
          <input className="input" {...register('name', { required: 'Required', minLength: 2 })} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea rows={3} className="input" {...register('description')} />
        </div>
        <div>
          <label className="label">Cuisines (comma-separated)</label>
          <input className="input" placeholder="Indian, Chinese" {...register('cuisine')} />
        </div>
        <div>
          <label className="label">Cost for two (INR)</label>
          <input type="number" min={0} className="input" {...register('costForTwo', { valueAsNumber: true, min: 0 })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Cover image URL</label>
          <input className="input" {...register('coverImage')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Additional image URLs (one per line)</label>
          <textarea rows={3} className="input" {...register('imageList')} />
        </div>

        <h2 className="sm:col-span-2 mt-2 border-t border-ink-100 pt-4 text-lg font-bold">Address</h2>
        <div className="sm:col-span-2">
          <label className="label">Address line 1</label>
          <input className="input" {...register('line1', { required: true })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Address line 2 (optional)</label>
          <input className="input" {...register('line2')} />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" {...register('city', { required: true })} />
        </div>
        <div>
          <label className="label">State</label>
          <input className="input" {...register('state', { required: true })} />
        </div>
        <div>
          <label className="label">Postal code</label>
          <input className="input" {...register('postalCode', { required: true, pattern: /^[0-9]{6}$/ })} />
        </div>

        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : restaurant ? 'Save changes' : 'Create restaurant'}
          </button>
        </div>
      </form>
    </div>
  );
}
