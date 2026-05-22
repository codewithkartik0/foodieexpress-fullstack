import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Logo';
import { asMessage } from '../../api/client';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const user = await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      const dest = from && from !== '/login' ? from : roleHome(user.role);
      navigate(dest, { replace: true });
    } catch (e) {
      toast.error(asMessage(e, 'Invalid credentials'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-white">
        <Logo to="/" className="text-white [&_span]:text-white" />
        <div>
          <h2 className="text-3xl font-extrabold leading-tight">Welcome back!</h2>
          <p className="mt-3 max-w-md text-white/85">
            Sign in to continue ordering from your favourite local restaurants. Track every order,
            collect ratings, and pay securely.
          </p>
        </div>
        <p className="text-xs text-white/75">© FoodieExpress · Academic project</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Logo to="/" className="lg:hidden" />
          <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Use your email and password to continue.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                autoComplete="email"
                type="email"
                {...register('email', { required: 'Required' })}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                autoComplete="current-password"
                type="password"
                {...register('password', { required: 'Required' })}
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="text-brand-600 hover:text-brand-700">Forgot password?</Link>
              <Link to="/register" className="text-brand-600 hover:text-brand-700">Create an account</Link>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              Sign in
            </button>
          </form>

          <p className="mt-8 rounded-lg bg-ink-100 p-3 text-xs text-ink-600">
            <strong>Demo accounts:</strong>
            <br />admin@foodieexpress.dev / Admin@12345
            <br />owner.spice@foodie.dev / Owner@12345
            <br />customer@foodie.dev / Customer@12345
          </p>
        </div>
      </div>
    </div>
  );
}

function roleHome(role: 'customer' | 'restaurant' | 'admin'): string {
  switch (role) {
    case 'admin':
      return '/platform';
    case 'restaurant':
      return '/admin';
    default:
      return '/';
  }
}
