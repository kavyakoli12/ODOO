import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  Shield,
  MapPin,
  Calendar,
  Upload,
  CheckCircle2,
  ArrowRight,
  X,
  FileText,
  EyeOff,
  Camera,
  Sparkles,
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  useToast,
  LoadingSpinner,
} from '@/components/ui';
import { LocationPicker } from '@/components/incidents/LocationPicker';
import { AICrimeCameraModal, AICrimeAnalysisResult, LocationData } from '@/components/incidents/AICrimeCameraModal';
import { TrinetraLogo } from '@/components/common/TrinetraLogo';
import type { IncidentCategory, Incident } from '@/types/incident';
import { toLocalDateTimeString } from '@/lib/utils';
import { getFastCurrentPosition, cachedReverseGeocode } from '@/lib/geolocation';

export function ReportIncidentPage() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const submitButtonRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Form State — auto-prefill category from URL query param if supplied (e.g. ?category=theft)
  const initialCategoryParam = searchParams.get('category') || 'theft';
  const [title, setTitle] = useState('');
  const [categorySlug, setCategorySlug] = useState(initialCategoryParam);

  // Sync category if URL param changes dynamically
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setCategorySlug(cat);
    }
  }, [searchParams]);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(2);
  const [incidentDate, setIncidentDate] = useState(toLocalDateTimeString());
  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.209);
  const [address, setAddress] = useState('Connaught Place, New Delhi');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Evidence File State
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedIncident, setSubmittedIncident] = useState<Incident | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Crime Camera State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [aiVerificationData, setAiVerificationData] = useState<{
    confidence: number;
    category: string;
    indicators: string[];
  } | null>(null);

  const handleAICameraAutoFill = (
    analysis: AICrimeAnalysisResult,
    file: File,
    previewUrl: string,
    locData?: LocationData
  ) => {
    setTitle(analysis.title);
    setDescription(analysis.description);
    setSeverity(analysis.severity);

    // Match category slug from available categories
    let matched = categories.find(
      (c) =>
        c.slug.toLowerCase() === analysis.categorySlug.toLowerCase() ||
        c.name.toLowerCase().includes(analysis.categorySlug.toLowerCase())
    );
    if (!matched && (analysis.categorySlug === 'other' || !analysis.isCrimeOrHazard)) {
      matched = categories.find((c) => c.slug === 'suspicious-activity' || c.slug === 'other');
    }
    if (matched) {
      setCategorySlug(matched.slug);
    } else if (categories.length > 0) {
      setCategorySlug(categories[0].slug);
    }

    // Attach captured camera image directly into the evidence section
    setEvidenceFile(file);
    setEvidencePreview(previewUrl);

    // Set precise location & address from GPS locData if already resolved
    if (locData && locData.address) {
      setLatitude(locData.lat);
      setLongitude(locData.lng);
      setAddress(locData.address);
    } else {
      // Fetch device location with fast resolution and cached reverse geocoding
      getFastCurrentPosition({ preferHighAccuracy: false, timeoutMs: 3500 }).then(async (result) => {
        setLatitude(result.coords.lat);
        setLongitude(result.coords.lng);
        const resolvedAddress = await cachedReverseGeocode(result.coords.lat, result.coords.lng);
        setAddress(resolvedAddress);
      }).catch(() => {});
    }

    setAiVerificationData({
      confidence: analysis.confidence,
      category: analysis.category,
      indicators: analysis.indicators,
    });

    showToast(
      'success',
      `Crime scene verified (${analysis.confidence}% confidence). Form auto-filled with GPS location & photo attached to evidence.`,
      'AI Crime Scan Complete'
    );
  };

  // Ensure page starts at top header
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/incidents/categories');
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.warn('Could not fetch categories, using defaults');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCats();
  }, []);

  const handleLocationChange = (lat: number, lng: number, addr: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setAddress(addr);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'File exceeds 5MB size limit', 'File Too Large');
        return;
      }

      setEvidenceFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setEvidencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setEvidenceFile(null);
    setEvidencePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !address.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Submit incident report
      const res = await api.post('/incidents', {
        title: title.trim(),
        description: description.trim(),
        categorySlug,
        severity: Number(severity),
        latitude,
        longitude,
        address: address.trim(),
        incidentDate: new Date(incidentDate).toISOString(),
        isAnonymous,
      });

      if (res.data.success && res.data.data) {
        const newInc: Incident = res.data.data;

        // 2. Upload optional evidence if attached
        if (evidenceFile) {
          const formData = new FormData();
          formData.append('file', evidenceFile);
          try {
            await api.post(`/incidents/${newInc.id}/evidence`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } catch (evErr) {
            console.warn('Evidence upload failed, but incident was saved', evErr);
          }
        }

        setSubmittedIncident(newInc);
        showToast(
          'success',
          `Incident ${newInc.trackingId} submitted successfully with status SUBMITTED`,
          'Report Submitted'
        );
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to submit report. Please try again.';
      setErrorMessage(msg);
      showToast('error', msg, 'Submission Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Confirmation Screen when submitted
  if (submittedIncident) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95 duration-200">
        <Card className="border-emerald-500/40 bg-slate-900/90 shadow-2xl text-center p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-xl shadow-emerald-950/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Incident Report Acknowledged
          </h2>

          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            Your incident report has been securely registered in the Trinetra system with initial status{' '}
            <strong className="text-slate-200">SUBMITTED</strong>. It has been placed in the triage queue for official verification.
          </p>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left space-y-2 mb-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Tracking Reference:</span>
              <span className="font-mono font-bold text-brand-300 text-sm">
                {submittedIncident.trackingId}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Status:</span>
              <Badge status="submitted" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Category:</span>
              <span className="text-white font-medium">{submittedIncident.categoryName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Recorded Location:</span>
              <span className="text-slate-300 truncate max-w-[200px]">{submittedIncident.address}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={`/citizen/reports/${submittedIncident.id}`} className="w-full sm:w-auto">
              <Button variant="primary" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View Full Report Details
              </Button>
            </Link>
            <Link to="/citizen" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 pb-28 px-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-400" />
            Report an Incident
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Provide details of the incident below. All submissions start as unverified reports.
          </p>
        </div>
        <Link to="/citizen">
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
        </Link>
      </div>

      {/* Trinetra AI Crime Camera Scanner Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/60 via-slate-900 to-brand-950/60 border border-red-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <TrinetraLogo size="md" variant="badge" className="mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Trinetra AI Vision Eye
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                AUTO-COMPLAIN
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">
              Point your camera at the scene. Trinetra AI automatically analyzes the crime, verifies visual indicators, auto-fills the report fields, and attaches the captured photo into the evidence section.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          leftIcon={<Camera className="w-4 h-4 text-white" />}
          rightIcon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
          onClick={() => setIsCameraModalOpen(true)}
          className="bg-gradient-to-r from-red-600 to-brand-600 hover:from-red-500 hover:to-brand-500 text-white font-bold shrink-0 shadow-lg shadow-red-600/30"
        >
          Scan Crime with AI Camera
        </Button>
      </div>

      {/* AI Verification Confirmation Alert (if auto-filled) */}
      {aiVerificationData && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                AI Crime Scene Verified
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {aiVerificationData.confidence}% Confidence
                </span>
              </div>
              <p className="text-emerald-200/80 text-[11px] mt-0.5">
                Category: <strong>{aiVerificationData.category}</strong>. Details auto-filled and camera photo attached to evidence below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiVerificationData(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Unverified Incident Notice Banner */}
      <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-700/30 text-xs text-indigo-300 flex items-start gap-3">
        <Shield className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <span className="font-semibold text-white">Citizen Submission Notice:</span>
          <p className="text-slate-400 text-[11px]">
            Reports submitted here are initially cataloged as <strong>SUBMITTED</strong>. They do not constitute official confirmed crimes until investigated and verified by authorized law enforcement personnel.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/40 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Classification & Title */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle className="text-base">1. Incident Classification</CardTitle>
            <CardDescription>
              Select the primary incident category and a concise title.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isLoadingCategories ? (
                <LoadingSpinner size="sm" label="Loading categories..." />
              ) : (
                <div className="space-y-1.5">
                  <Select
                    label="Category *"
                    options={categories.map((c) => ({ value: c.slug, label: c.name }))}
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    required
                  />
                  {description.length > 8 && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.post('/ai/categorize', { title, description });
                          if (res.data.success && res.data.suggestions?.length > 0) {
                            const top = res.data.suggestions[0].category.toLowerCase();
                            const matched = categories.find((c) => c.name.toLowerCase().includes(top) || top.includes(c.slug));
                            if (matched) setCategorySlug(matched.slug);
                            showToast('info', `AI Suggested: ${res.data.suggestions[0].category} (${res.data.suggestions[0].confidence}% confidence)`, 'AI Auto-Category');
                          }
                        } catch {}
                      }}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors pt-0.5"
                    >
                      ✨ Auto-Detect Category with AI
                    </button>
                  )}
                </div>
              )}

              <Input
                label="Date & Time of Occurrence *"
                type="datetime-local"
                value={incidentDate}
                max={toLocalDateTimeString(new Date(Date.now() + 5 * 60 * 1000))}
                onChange={(e) => setIncidentDate(e.target.value)}
                leftIcon={<Calendar className="w-4 h-4" />}
                required
              />
            </div>

            <Input
              label="Incident Title *"
              placeholder="e.g. Stolen backpack near library cafe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              helperText="Brief summary of what happened (5-150 characters)"
              required
            />

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Severity Assessment
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { level: 1, label: 'Minor', desc: 'No injury / low value' },
                  { level: 2, label: 'Moderate', desc: 'Theft / vandalism' },
                  { level: 3, label: 'Serious', desc: 'Burglary / threat' },
                  { level: 4, label: 'Severe', desc: 'Assault / weapon' },
                  { level: 5, label: 'Critical', desc: 'Life endangerment' },
                ].map((s) => (
                  <button
                    key={s.level}
                    type="button"
                    onClick={() => setSeverity(s.level)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      severity === s.level
                        ? 'bg-brand-600/30 border-brand-500 text-white shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">Level {s.level}</div>
                    <div className="text-[10px] text-slate-400">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Location Selection */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400" />
              2. Incident Location Selection
            </CardTitle>
            <CardDescription>
              Click on the map or use GPS to set the incident location coordinates.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              address={address}
              onChange={handleLocationChange}
            />
          </CardContent>
        </Card>

        {/* Section 3: Description & Evidence */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle className="text-base">3. Detailed Narrative & Evidence</CardTitle>
            <CardDescription>
              Provide an objective account of what happened, persons involved, or vehicle descriptions.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Detailed Description *
              </label>
              <textarea
                className="w-full bg-slate-900/90 text-slate-100 placeholder:text-slate-500 rounded-lg p-3 text-sm border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[120px]"
                placeholder="Describe what occurred, any suspects (clothing, height, direction of escape), witnesses, or identifying vehicle marks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                required
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Minimum 10 characters</span>
                <span>{description.length} / 2000 characters</span>
              </div>
            </div>

            {/* Evidence Photo Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Optional Photo Evidence (JPEG, PNG, WebP — Max 5MB)
              </label>

              {evidencePreview ? (
                <div className="relative inline-block border border-slate-700 rounded-xl overflow-hidden shadow-lg">
                  <img
                    src={evidencePreview}
                    alt="Evidence Preview"
                    className="max-h-48 rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/90 text-slate-300 hover:text-rose-400 hover:bg-slate-900 border border-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-300 font-medium">Click to select photo evidence</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Photos are strictly access-controlled</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>

            {/* Anonymous Toggle */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <EyeOff className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs font-medium text-white">Submit Anonymously</div>
                  <div className="text-[10px] text-slate-400">Hides your name from public and general officer views</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 bg-slate-800 border-slate-700 focus:ring-brand-500 cursor-pointer"
              />
            </div>
          </CardContent>

          <div ref={submitButtonRef}>
            <CardFooter className="flex items-center justify-end gap-3">
              <Link to="/citizen">
                <Button type="button" variant="outline" size="md">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="bg-gradient-to-r from-red-600 to-brand-600 hover:from-red-500 hover:to-brand-500 text-white font-bold shadow-lg shadow-red-600/30"
              >
                Submit Report
              </Button>
            </CardFooter>
          </div>
        </Card>
      </form>

      {/* Sticky Quick-Submit Floating Bar — Always on-screen after AI auto-fill */}
      {aiVerificationData && !isSubmitting && (
        <div className="sticky bottom-4 z-40 p-3 sm:p-4 rounded-2xl bg-slate-900/95 border border-emerald-500/60 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                AI Vision Auto-Fill Complete
              </div>
              <div className="text-[11px] text-emerald-400 font-mono truncate">
                Evidence attached • Location verified • Ready to submit
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => submitButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="hidden sm:inline-flex text-xs text-slate-300"
            >
              Review Form
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => {
                const formEl = document.querySelector('form');
                if (formEl) {
                  formEl.requestSubmit();
                }
              }}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30"
            >
              Submit Report Now
            </Button>
          </div>
        </div>
      )}

      {/* Trinetra AI Live Camera Modal */}
      <AICrimeCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onAutoFill={handleAICameraAutoFill}
      />
    </div>
  );
}
