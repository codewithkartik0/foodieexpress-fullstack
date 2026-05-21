import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Logo';
import { asMessage } from '../../api/client';

const OTP_LENGTH = 6;

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

export default function VerifyEmailPage() {
  const { verifyEmail, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Read email from query string OR location.state OR fail-safe redirect to register
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const email = (stateEmail ?? params.get('email') ?? '').toLowerCase();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
      return;
    }
    inputs.current[0]?.focus();
  }, [email, navigate]);

  // Countdown for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const it = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(it);
  }, [resendCooldown]);

  const fullCode = digits.join('');
  const canSubmit = fullCode.length === OTP_LENGTH && /^\d{6}$/.test(fullCode);

  const setDigit = (idx: number, value: string) => {
    const onlyDigit = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = onlyDigit;
      return next;
    });
    if (onlyDigit && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const onKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    } else if (e.key === 'Enter' && canSubmit) {
      void onSubmit();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputs.current[focusIdx]?.focus();
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const user = await verifyEmail(email, fullCode);
      toast.success('Email verified! Welcome aboard.');
      navigate(roleHome(user.role), { replace: true });
    } catch (err) {
      toast.error(asMessage(err, 'Verification failed'));
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    try {
      await resendOtp(email);
      toast.success('A new code has been sent to your email');
      setResendCooldown(60);
    } catch (err) {
      toast.error(asMessage(err, 'Could not resend code'));
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = useMemo(() => {
    if (!email) return '';
    const [user, domain] = email.split('@');
    if (!domain) return email;
    const masked = user.length <= 2 ? user[0] + '*' : user.slice(0, 2) + '***';
    return `${masked}@${domain}`;
  }, [email]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-white">
        <Logo to="/" className="text-white [&_span]:text-white" />
        <div>
          <h2 className="text-3xl font-extrabold leading-tight">Just one quick check</h2>
          <p className="mt-3 max-w-md text-white/85">
            We sent a 6-digit code to your email so we know it’s really you. The code expires in 10 minutes.
          </p>
        </div>
        <p className="text-xs text-white/75">© FoodieExpress · Academic project</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Logo to="/" className="lg:hidden" />
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <MailCheck size={14} /> Verify your email
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Enter the 6-digit code</h1>
          <p className="mt-1 text-sm text-ink-500">
            We sent it to <span className="font-medium text-ink-700">{maskedEmail}</span>.
            Check your inbox (and spam folder).
          </p>

          <form onSubmit={onSubmit} className="mt-8">
            <div className="flex justify-between gap-2 sm:gap-3">
              {digits.map((d, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={d}
                  onChange={(e) => setDigit(idx, e.target.value)}
                  onKeyDown={(e) => onKeyDown(idx, e)}
                  onPaste={onPaste}
                  className="h-14 w-12 rounded-lg border-2 border-ink-200 bg-white text-center text-2xl font-bold tracking-widest text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:h-16 sm:w-14"
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>

            <button type="submit" disabled={!canSubmit || submitting} className="btn-primary mt-6 w-full">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <MailCheck size={16} />}
              Verify and continue
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm text-ink-500">
            <span>Didn’t get the code?</span>
            <button
              type="button"
              onClick={onResend}
              disabled={resending || resendCooldown > 0}
              className="inline-flex items-center gap-1.5 font-semibold text-brand-600 disabled:opacity-50"
            >
              {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>

          <p className="mt-8 text-xs text-ink-400">
            Wrong email?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Start over
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
