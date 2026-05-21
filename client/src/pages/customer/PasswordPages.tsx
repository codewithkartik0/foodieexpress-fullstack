import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import { Logo } from '../../components/Logo';
import { asMessage } from '../../api/client';

export function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit } = useForm<{ email: string }>();

  const onSubmit = handleSubmit(async ({ email }) => {
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (e) {
      toast.error(asMessage(e));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="container-page py-16 max-w-md">
      <Logo to="/" />
      <h1 className="mt-8 text-2xl font-bold">Forgot your password?</h1>
      {sent ? (
        <p className="mt-4 text-ink-600">
          If an account with that email exists, a password-reset link has been sent. Check your inbox.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" {...register('email', { required: true })} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Send reset link
          </button>
          <p className="text-center text-sm text-ink-500">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-brand-600">Sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
}

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<{ password: string; confirm: string }>();

  const onSubmit = handleSubmit(async ({ password, confirm }) => {
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (!token) return;
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (e) {
      toast.error(asMessage(e, 'Reset link is invalid or expired'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="container-page py-16 max-w-md">
      <Logo to="/" />
      <h1 className="mt-8 text-2xl font-bold">Set a new password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" {...register('password', { required: true, minLength: 8 })} />
          {errors.password && <p className="mt-1 text-xs text-red-600">Min 8 characters with letters and numbers</p>}
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input className="input" type="password" {...register('confirm', { required: true })} />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Update password
        </button>
      </form>
    </div>
  );
}
