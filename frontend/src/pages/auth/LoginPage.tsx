import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, KeyRound } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, useToast } from '@/components/ui';
import type { AuthResponse } from '@/types/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post<AuthResponse>('/auth/login', {
        email: email.trim(),
        password,
      });

      if (res.data.success && res.data.user && res.data.accessToken) {
        const { user, accessToken } = res.data;
        setAuth(user, accessToken);
        showToast('success', `Welcome back, ${user.name}!`, 'Login Successful');

        // Redirect to intended route or role-specific portal
        if (from) {
          navigate(from, { replace: true });
        } else if (user.role === 'officer') {
          navigate('/officer', { replace: true });
        } else if (user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/citizen', { replace: true });
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to connect to server. Please try again.';
      setErrorMessage(msg);
      showToast('error', msg, 'Authentication Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword('Demo@1234');
    setErrorMessage(null);
    showToast('info', `Loaded credentials for Demo ${demoRole}`, 'Demo Helper');
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        {/* Brand Icon & Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white mx-auto shadow-xl shadow-brand-600/30">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Sign In to Safe<span className="text-brand-400">Map</span>
          </h1>
          <p className="text-xs text-slate-400">
            Access your citizen reporting dashboard or law enforcement console
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-base">Account Credentials</CardTitle>
            <CardDescription>
              Enter your verified credentials below to authenticate.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800/40 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                autoComplete="current-password"
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>

            {/* Quick Demo Credentials Bar */}
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2">
                <KeyRound className="w-3.5 h-3.5 text-brand-400" />
                <span>One-Click Hackathon Demo Logins:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('citizen@demo.com', 'Citizen')}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[11px] text-slate-200 font-medium transition-colors text-center"
                >
                  👤 Citizen
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('officer@demo.com', 'Officer')}
                  className="p-2 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/40 text-[11px] text-indigo-300 font-medium transition-colors text-center"
                >
                  👮 Officer
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin@demo.com', 'Admin')}
                  className="p-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/40 text-[11px] text-purple-300 font-medium transition-colors text-center"
                >
                  ⚡ Admin
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-center text-xs text-slate-400">
            <span>Don't have an account?</span>{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium ml-1">
              Create Citizen Account
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
