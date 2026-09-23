import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Mail, ShieldCheck, ArrowRight, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button, Card, CardHeader, CardDescription, CardContent, CardFooter, useToast } from '@/components/ui';
import { TrinetraLogo } from '@/components/common/TrinetraLogo';
import type { AuthResponse } from '@/types/auth';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const { showToast } = useToast();

  const queryParams = new URLSearchParams(location.search);
  const initialEmail = queryParams.get('email') || (location.state as any)?.email || '';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(45);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of full 6-digit code
    if (value.length > 1) {
      const cleanValue = value.replace(/\D/g, '').slice(0, 6);
      if (cleanValue.length > 0) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = cleanValue[i] || '';
        }
        setOtpDigits(newDigits);
        const nextIndex = Math.min(cleanValue.length, 5);
        inputRefs.current[nextIndex]?.focus();
      }
      return;
    }

    // Only allow single digit
    const digit = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullCode = otpDigits.join('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email) {
      setErrorMessage('Email address is required.');
      return;
    }

    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post<AuthResponse>('/auth/verify-email', {
        email: email.trim(),
        code: fullCode,
      });

      if (res.data.success && res.data.user && res.data.accessToken) {
        setAuth(res.data.user, res.data.accessToken);
        showToast('success', 'Email verified successfully! You can now complete your profile.', 'Account Activated');
        // Direct new user to profile to optionally add family contacts and address
        navigate('/profile', { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Verification failed. Please check the code and try again.';
      setErrorMessage(msg);
      showToast('error', msg, 'Verification Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    if (!email) {
      setErrorMessage('Please enter your email to resend code.');
      return;
    }

    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await api.post<any>('/auth/resend-verification', {
        email: email.trim(),
      });

      if (res.data.success) {
        showToast('info', res.data.message || 'A new verification code was sent to your email.', 'Code Resent');
        setResendCooldown(60);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to resend verification code.';
      setErrorMessage(msg);
      showToast('error', msg, 'Resend Failed');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <TrinetraLogo size="xl" variant="badge" className="mx-auto" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Verify Your Email
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              We sent a 6-digit confirmation code to your inbox
            </p>
          </div>
        </div>

        {/* Verification Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200">
              <div className="flex items-center gap-2 truncate flex-1 font-mono text-[11px]">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                {isEditingEmail ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-900 border border-indigo-500 rounded px-2 py-0.5 text-white text-xs w-full outline-none"
                    placeholder="Enter your email"
                  />
                ) : (
                  <span className="truncate">{email || 'No email provided'}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingEmail(!isEditingEmail)}
                className="ml-2 text-[10px] text-brand-400 hover:text-brand-300 underline shrink-0"
              >
                {isEditingEmail ? 'Done' : 'Change'}
              </button>
            </div>
            <CardDescription className="text-xs text-slate-400 pt-2">
              Enter the 6-digit verification code below to activate your account and access rapid response services.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/50 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 6 Digit Inputs */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-3 text-center">
                  Enter 6-Digit OTP Code
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl bg-slate-950 border-2 border-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-white transition-all shadow-inner outline-none"
                    />
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11"
                disabled={fullCode.length !== 6 || isLoading}
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Verify & Activate Account
              </Button>

              {/* Resend Link & Timer */}
              <div className="text-center pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Didn't receive the email?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                  className="font-medium text-brand-400 hover:text-brand-300 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t border-slate-800/80 text-xs text-slate-400 pt-4">
            <Link to="/register" className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to registration</span>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
