import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { authApi } from '../api/endpoints';
import { clearTokens, setTokens } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authed' | 'unauthed';
}

type Action =
  | { type: 'LOADING' }
  | { type: 'AUTHED'; user: User }
  | { type: 'UNAUTHED' }
  | { type: 'PATCH_USER'; user: User };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading' };
    case 'AUTHED':
      return { user: action.user, status: 'authed' };
    case 'UNAUTHED':
      return { user: null, status: 'unauthed' };
    case 'PATCH_USER':
      return { ...state, user: action.user };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  login(email: string, password: string): Promise<User>;
  register(args: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: 'customer' | 'restaurant';
  }): Promise<{ verificationRequired: true; email: string; message: string }>;
  verifyEmail(email: string, otp: string): Promise<User>;
  resendOtp(email: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { user: null, status: 'idle' as const });

  const refresh = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const res = await authApi.me();
      dispatch({ type: 'AUTHED', user: res.data.data.user });
    } catch {
      dispatch({ type: 'UNAUTHED' });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setTokens(res.data.data.accessToken, res.data.data.refreshToken);
    dispatch({ type: 'AUTHED', user: res.data.data.user });
    return res.data.data.user;
  }, []);

  const register = useCallback(
    async (args: { email: string; password: string; fullName: string; phone?: string; role?: 'customer' | 'restaurant' }) => {
      const res = await authApi.register(args);
      // No tokens are returned now – the user must verify their email first.
      return {
        verificationRequired: true as const,
        email: res.data.data.email,
        message: res.data.data.message,
      };
    },
    [],
  );

  const verifyEmail = useCallback(async (email: string, otp: string) => {
    const res = await authApi.verifyEmail({ email, otp });
    setTokens(res.data.data.accessToken, res.data.data.refreshToken);
    dispatch({ type: 'AUTHED', user: res.data.data.user });
    return res.data.data.user;
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    await authApi.resendOtp(email);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearTokens();
    dispatch({ type: 'UNAUTHED' });
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      ...state,
      login,
      register,
      verifyEmail,
      resendOtp,
      logout,
      refresh,
    }),
    [state, login, register, verifyEmail, resendOtp, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
