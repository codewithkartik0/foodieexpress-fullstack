import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Logo';
import { asMessage } from '../../api/client';

interface RegisterForm {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: 'customer' | 'restaurant';
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: { role: 'customer' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = await registerUser(values);
      toast.success('Almost there — check your email for the verification code.');
      navigate(`/verify-email?email=${encodeURIComponent(result.email)}`, {
        replace: true,
        state: { email: result.email },
      });
    } catch (e) {
      toast.error(asMessage(e, 'Could not create account'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-white">
        <Logo to="/" className="text-white [&_span]:text-white" />
        <div>
          <h2 className="text-3xl font-extrabold leading-tight">Join FoodieExpress today</h2>
          <p className="mt-3 max-w-md text-white/85">
            Order food, run a restaurant, or both. One account works across the platform.
          </p>
        </div>
        <p className="text-xs text-white/75">© FoodieExpress · Academic project</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Logo to="/" className="lg:hidden" />
          <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-ink-500">Takes less than a minute.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" {...register('fullName', { required: 'Required', minLength: { value: 2, message: 'Too short' } })} />
              {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" autoComplete="email" {...register('email', { required: 'Required' })} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone (optional)</label>
              <input className="input" type="tel" {...register('phone', { pattern: { value: /^[0-9]{10}$/, message: '10 digits' } })} />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" autoComplete="new-password" {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              <p className="mt-1 text-xs text-ink-500">Use at least 8 characters with letters and numbers.</p>
            </div>
            <div>
              <label className="label">I am a</label>
              <select className="input" {...register('role')}>
                <option value="customer">Customer (I want to order food)</option>
                <option value="restaurant">Restaurant Owner (I run a restaurant)</option>
              </select>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Create account
            </button>

            <p className="text-center text-sm text-ink-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
