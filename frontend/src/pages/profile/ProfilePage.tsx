import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import {
  User as UserIcon,
  Phone,
  Mail,
  ShieldCheck,
  Home,
  HeartPulse,
  Save,
  CheckCircle2,
  AlertCircle,
  Users,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  useToast,
} from '@/components/ui';

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    familyPhone: '',
    familyName: '',
    familyRelation: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    bloodGroup: '',
    medicalNotes: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize form with current user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        familyPhone: user.familyPhone || '',
        familyName: user.familyName || '',
        familyRelation: user.familyRelation || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || '',
        bloodGroup: user.bloodGroup || '',
        medicalNotes: user.medicalNotes || '',
      });
    }
  }, [user]);

  // Calculate profile completeness
  const calculateCompleteness = () => {
    const checks = [
      Boolean(formData.name),
      Boolean(user?.isEmailVerified),
      Boolean(formData.phone),
      Boolean(formData.familyPhone),
      Boolean(formData.address),
      Boolean(formData.bloodGroup),
    ];
    const completedCount = checks.filter(Boolean).length;
    return Math.round((completedCount / checks.length) * 100);
  };

  const completeness = calculateCompleteness();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.put<{ success: boolean; user: any; message?: string }>('/auth/profile', {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        familyPhone: formData.familyPhone.trim(),
        familyName: formData.familyName.trim(),
        familyRelation: formData.familyRelation.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        bloodGroup: formData.bloodGroup.trim(),
        medicalNotes: formData.medicalNotes.trim(),
      });

      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        setSuccessMsg('Profile updated successfully!');
        showToast('success', 'Your profile and emergency contact details have been updated.', 'Profile Saved');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to update profile. Please try again.';
      setErrorMsg(msg);
      showToast('error', msg, 'Update Failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-slate-400 text-sm">Please sign in to view your profile.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Profile Banner & Header */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 border-2 border-brand-400/30 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg shadow-brand-500/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {user.name}
                </h1>
                <Badge
                  status={user.role === 'officer' ? 'assigned' : 'verified'}
                  className="text-xs uppercase font-semibold"
                >
                  {user.role}
                </Badge>
                {user.isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Email
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {user.email}
              </p>
            </div>
          </div>

          {/* Profile Completeness Gauge */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 sm:w-64 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                Profile Strength
              </span>
              <span className="text-white font-bold">{completeness}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  completeness >= 80
                    ? 'bg-emerald-500'
                    : completeness >= 50
                    ? 'bg-brand-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              {completeness === 100
                ? 'Your emergency contact profile is complete!'
                : 'Add optional family numbers & address for emergency SOS dispatch.'}
            </p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-700/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Details */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-brand-400" />
              <CardTitle className="text-base">Personal Details</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Primary identification and registered citizen profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Jane Doe"
                leftIcon={<UserIcon className="w-4 h-4 text-slate-500" />}
                required
              />

              <Input
                label="Email Address"
                value={user.email}
                disabled
                helperText="Email is locked to your verified login credentials."
                leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Personal Mobile Number (Optional)"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="e.g. +91 98765 43210"
                helperText="Used for law enforcement callback during reported incidents."
                leftIcon={<Phone className="w-4 h-4 text-slate-500" />}
              />

              {user.badgeNumber && (
                <Input
                  label="Officer Badge Number"
                  value={user.badgeNumber}
                  disabled
                  helperText="Issued by department administrator."
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Emergency & Family Contacts (Optional) */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-xl border-l-4 border-l-cyan-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <CardTitle className="text-base">Family & Emergency SOS Contact</CardTitle>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40 uppercase">
                Optional
              </span>
            </div>
            <CardDescription className="text-xs">
              Designate a trusted family member or emergency contact to notify during distress alerts or Safe Passage escorts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/30 text-xs text-cyan-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Trinetra Safe Escort Integration
              </div>
              <p className="text-[11px] text-slate-400">
                If you enter a high-risk red zone and trigger a distress signal or stoppage alarm, officers can rapidly contact this designated emergency number.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Family Contact Number"
                value={formData.familyPhone}
                onChange={(e) => handleChange('familyPhone', e.target.value)}
                placeholder="e.g. +91 98765 11223"
                helperText="Direct emergency phone number"
                leftIcon={<Phone className="w-4 h-4 text-cyan-400" />}
              />

              <Input
                label="Contact Person Name"
                value={formData.familyName}
                onChange={(e) => handleChange('familyName', e.target.value)}
                placeholder="e.g. Robert Doe"
                helperText="Full name of emergency contact"
                leftIcon={<UserIcon className="w-4 h-4 text-slate-500" />}
              />

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Relationship
                </label>
                <select
                  value={formData.familyRelation}
                  onChange={(e) => handleChange('familyRelation', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                >
                  <option value="">Select relation...</option>
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse / Partner</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Friend">Friend / Colleague</option>
                  <option value="Other">Other</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Relation to citizen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Home & Residential Address (Optional) */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-400" />
                <CardTitle className="text-base">Home & Residential Details</CardTitle>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                Optional
              </span>
            </div>
            <CardDescription className="text-xs">
              Helps dispatch patrol units and verify jurisdiction for localized community safety feeds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Street Address / Residence"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="e.g. Flat 302, Green Park Residency, Sector 4"
              leftIcon={<MapPin className="w-4 h-4 text-slate-500" />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City / Town"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="e.g. New Delhi"
              />

              <Input
                label="State / Province"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="e.g. Delhi NCR"
              />

              <Input
                label="PIN / Postal Code"
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
                placeholder="e.g. 110016"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Vital Medical & Emergency Info (Optional) */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <CardTitle className="text-base">Medical & First-Aid Details</CardTitle>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                Optional
              </span>
            </div>
            <CardDescription className="text-xs">
              Vital information to assist first-responders and ambulance medics in emergencies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Blood Group
                </label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => handleChange('bloodGroup', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                >
                  <option value="">Select Blood Group...</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <Input
                label="Medical Notes & Known Allergies"
                value={formData.medicalNotes}
                onChange={(e) => handleChange('medicalNotes', e.target.value)}
                placeholder="e.g. Asthma, Penicillin allergy, Diabetic"
                helperText="Provided to medical responders during triage."
              />
            </div>
          </CardContent>
        </Card>

        {/* Sticky / Fixed Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
            className="px-6"
          >
            Save Profile Details
          </Button>
        </div>
      </form>
    </div>
  );
}
