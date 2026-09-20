import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, useToast } from '@/components/ui';
import { TrinetraLogo } from '@/components/common/TrinetraLogo';
import type { AuthResponse } from '@/types/auth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post<AuthResponse>('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });

      if (res.data.success && res.data.user && res.data.accessToken) {
        const { user, accessToken } = res.data;
        setAuth(user, accessToken);
        showToast('success', `Account created! Welcome to Trinetra, ${user.name}.`, 'Registration Success');
        navigate('/citizen', { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      setErrorMessage(msg);
      showToast('error', msg, 'Registration Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <TrinetraLogo size="xl" variant="badge" className="mx-auto" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Create Trinetra Account
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Join Trinetra to report neighborhood incidents, track investigations, and receive alerts
            </p>
          </div>
        </div>

        {/* Register Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-base">Citizen Registration</CardTitle>
            <CardDescription>
              All public registrations are granted verified citizen permissions.
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
                label="Full Name"
                type="text"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />

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
                placeholder="At least 8 characters..."
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
                helperText="Must be 8+ characters with at least 1 letter and 1 number"
                autoComplete="new-password"
                required
              />

              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
                required
              />

              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/30 text-[11px] text-indigo-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  RBAC Role Security Notice
                </div>
                <p className="text-[10px] text-slate-400">
                  Accounts created here receive <strong>CITIZEN</strong> role. Law enforcement officer accounts are provisioned exclusively via administrative clearance.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Account
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center text-xs text-slate-400">
            <span>Already have an account?</span>{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium ml-1">
              Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
