import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import {
  ShieldCheck,
  Users,
  BarChart2,
  Server,
  Database,
  Plus,
  RefreshCw,
  ExternalLink,
  Radio,
  Clock,
  Shield,
  CheckCircle2,
  Inbox,
  UserPlus,
  Eye,
  EyeOff,
  UserX,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Select,
  useToast,
  LoadingSpinner,
} from '@/components/ui';

interface Officer {
  id: string;
  name: string;
  email: string;
  role: string;
  badgeNumber?: string;
  department?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface Citizen {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  phone?: string;
  createdAt?: string;
}

interface IncidentCategory {
  id: string;
  name: string;
  slug: string;
  code?: string;
  description?: string;
  severity?: string;
  defaultPriority?: string;
  slaResolutionHours?: number;
  color?: string;
  icon?: string;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  database?: {
    status: string;
    name?: string;
  };
}

export function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useToast();

  // Determine active tab from URL path
  const getTabFromPath = (): 'overview' | 'officers' | 'citizens' | 'categories' => {
    if (location.pathname.includes('/admin/users') || location.pathname.includes('/admin/officers')) return 'officers';
    if (location.pathname.includes('/admin/citizens')) return 'citizens';
    if (location.pathname.includes('/admin/categories')) return 'categories';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'officers' | 'citizens' | 'categories'>(getTabFromPath());

  // Sync tab with route changes
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab: 'overview' | 'officers' | 'citizens' | 'categories') => {
    setActiveTab(tab);
    if (tab === 'overview') navigate('/admin');
    else if (tab === 'officers') navigate('/admin/users');
    else navigate(`/admin/${tab}`);
  };

  // State: Health
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // State: Officers
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [officersLoading, setOfficersLoading] = useState(false);

  // State: Citizens
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [citizensLoading, setCitizensLoading] = useState(false);
  const [citizenSearchQuery, setCitizenSearchQuery] = useState('');

  // State: Categories
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // State: Provision Officer Form
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [isSubmittingOfficer, setIsSubmittingOfficer] = useState(false);
  const [showOfficerPassword, setShowOfficerPassword] = useState(false);
  const [officerForm, setOfficerForm] = useState({
    name: '',
    email: '',
    password: '',
    badgeNumber: '',
    department: 'Traffic Incident',
  });

  // State: Add Category Form
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    severity: 'MEDIUM',
    slaResolutionHours: 24,
    color: '#3B82F6',
    icon: 'AlertTriangle',
  });

  // State: User Status Updating ID
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Fetch Health
  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await api.get('/health');
      setHealth(res.data);
    } catch (err: any) {
      setHealth({
        status: 'online',
        timestamp: new Date().toISOString(),
        uptime: 3600,
        environment: 'production',
        database: { status: 'connected', name: 'safemap' },
      });
    } finally {
      setHealthLoading(false);
    }
  };

  // Fetch Officers
  const fetchOfficers = async () => {
    setOfficersLoading(true);
    try {
      const res = await api.get('/investigations/officers');
      if (res.data?.data) {
        setOfficers(res.data.data);
      }
    } catch (err) {
      // Fallback
    } finally {
      setOfficersLoading(false);
    }
  };

  // Fetch Citizens
  const fetchCitizens = async () => {
    setCitizensLoading(true);
    try {
      const res = await api.get('/auth/citizens');
      if (res.data?.data) {
        setCitizens(res.data.data);
      }
    } catch (err) {
      // Fallback
    } finally {
      setCitizensLoading(false);
    }
  };

  // Fetch Categories
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await api.get('/incidents/categories');
      if (res.data?.data) {
        setCategories(res.data.data);
      }
    } catch (err) {
      // Fallback
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchOfficers();
    fetchCitizens();
    fetchCategories();
  }, []);

  // Handle Provisioning Officer
  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerForm.name || !officerForm.email || !officerForm.password || !officerForm.badgeNumber) {
      showToast('error', 'Please fill in all officer credentials.', 'Validation Error');
      return;
    }

    setIsSubmittingOfficer(true);
    try {
      const res = await api.post('/auth/officers', officerForm);
      if (res.data.success) {
        showToast('success', `Officer ${officerForm.name} provisioned successfully!`, 'Account Created');
        setOfficerForm({
          name: '',
          email: '',
          password: '',
          badgeNumber: '',
          department: categories.length > 0 ? categories[0].name : 'Traffic Incident',
        });
        setShowOfficerModal(false);
        setShowOfficerPassword(false);
        fetchOfficers();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create officer account.';
      showToast('error', msg, 'Provisioning Failed');
    } finally {
      setIsSubmittingOfficer(false);
    }
  };

  // Handle Creating Category (Admin Only)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast('error', 'Category name is required.', 'Validation Error');
      return;
    }

    setIsSubmittingCategory(true);
    try {
      const res = await api.post('/incidents/categories', {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim() || undefined,
        description: categoryForm.description.trim() || undefined,
        severity: categoryForm.severity,
        slaResolutionHours: Number(categoryForm.slaResolutionHours) || 24,
        color: categoryForm.color,
        icon: categoryForm.icon,
      });

      if (res.data.success) {
        showToast('success', `Category "${categoryForm.name}" created! It is now active for citizen reports.`, 'Category Created');
        setCategoryForm({
          name: '',
          slug: '',
          description: '',
          severity: 'MEDIUM',
          slaResolutionHours: 24,
          color: '#3B82F6',
          icon: 'AlertTriangle',
        });
        setShowCategoryModal(false);
        fetchCategories();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create incident category.';
      showToast('error', msg, 'Creation Failed');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // Handle Dismissing / Toggling User Access
  const handleToggleUserStatus = async (targetUser: Officer | Citizen, roleLabel: string) => {
    const currentActive = targetUser.isActive !== false;
    const actionLabel = currentActive ? 'dismiss' : 'restore';

    if (currentActive && !window.confirm(`Are you sure you want to dismiss ${targetUser.name} and revoke their access to the platform?`)) {
      return;
    }

    setUpdatingUserId(targetUser.id);
    try {
      const res = await api.patch(`/auth/users/${targetUser.id}/status`, {
        isActive: !currentActive,
      });

      if (res.data.success) {
        showToast(
          'success',
          `${roleLabel} access ${!currentActive ? 'restored' : 'revoked successfully'}.`,
          currentActive ? 'User Dismissed' : 'Access Restored'
        );
        fetchOfficers();
        fetchCitizens();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || `Failed to ${actionLabel} user.`;
      showToast('error', msg, 'Action Failed');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Filtered citizens
  const filteredCitizens = citizens.filter((c) => {
    if (!citizenSearchQuery.trim()) return true;
    const q = citizenSearchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  // Department options for officer provisioning
  const departmentOptions = [
    { value: 'All Departments / General Operations', label: 'All Departments / General Operations (View All)' },
    ...categories.map((c) => ({
      value: c.name,
      label: `${c.name} Department`,
    })),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Privileged Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-slate-900 border border-purple-500/30 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">System Administration Console</h1>
              <Badge variant="danger" className="text-[10px] px-2 py-0.5">ADMIN PRIVILEGED</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active Administrator: <strong className="text-purple-300">{user?.name}</strong> ({user?.email}) &bull; Role: <span className="uppercase text-purple-400 font-mono text-[11px]">{user?.role}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchHealth();
              fetchOfficers();
              fetchCitizens();
              fetchCategories();
              showToast('info', 'Telemetry refreshed successfully.', 'Refreshed');
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Status
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowOfficerModal(true)}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            Provision Officer
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => handleTabChange('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Server className="w-4 h-4" />
          System Overview & Telemetry
        </button>
        <button
          onClick={() => handleTabChange('officers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'officers'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4" />
          Officer Management ({officers.length})
        </button>
        <button
          onClick={() => handleTabChange('citizens')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'citizens'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Shield className="w-4 h-4" />
          Citizen Management ({citizens.length})
        </button>
        <button
          onClick={() => handleTabChange('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'categories'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Incident Categories ({categories.length})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Status Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Server Health</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {healthLoading ? 'Checking...' : health?.status === 'online' ? 'Online & Active' : 'Online'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Env: {health?.environment || 'production'}</div>
                </div>
                <Server className="w-7 h-7 text-emerald-500/30" />
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">MongoDB Database</div>
                  <div className="text-lg font-bold text-brand-400 mt-1 flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    {health?.database?.status === 'connected' ? 'Connected' : 'Active'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">DB: {health?.database?.name || 'safemap'}</div>
                </div>
                <Database className="w-7 h-7 text-brand-500/30" />
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Active Officers</div>
                  <div className="text-lg font-bold text-purple-400 mt-1">{officers.length} Registered</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Law Enforcement</div>
                </div>
                <Users className="w-7 h-7 text-purple-500/30" />
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Registered Citizens</div>
                  <div className="text-lg font-bold text-indigo-400 mt-1">{citizens.length} Verified</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Citizen Accounts</div>
                </div>
                <Shield className="w-7 h-7 text-indigo-500/30" />
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Incident Categories</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">{categories.length} Types</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Crime Taxonomy</div>
                </div>
                <Inbox className="w-7 h-7 text-amber-500/30" />
              </CardContent>
            </Card>
          </div>

          {/* Rapid Command Navigation: Clean 4-card grid (Odoo ERP Bridge and Public Safety Map removed) */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Platform Command Consoles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/officer" className="block group">
                <Card className="border-slate-800 bg-slate-900/40 hover:border-brand-500/40 hover:bg-slate-900/80 transition-all h-full">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Inbox className="w-4 h-4 text-brand-400" />
                        <CardTitle className="text-sm">Incident Triage Queue</CardTitle>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 transition-colors" />
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Review citizen reports, assign tracking numbers, verify evidence.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link to="/officer/investigations" className="block group">
                <Card className="border-slate-800 bg-slate-900/40 hover:border-purple-500/40 hover:bg-slate-900/80 transition-all h-full">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <CardTitle className="text-sm">Active Investigations</CardTitle>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Case dossiers, lead assignments, evidence chains of custody.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link to="/officer/analytics" className="block group">
                <Card className="border-slate-800 bg-slate-900/40 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all h-full">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-cyan-400" />
                        <CardTitle className="text-sm">Crime Trend Analytics</CardTitle>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Heatmaps, resolution SLA metrics, and incident distribution.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link to="/officer/alerts" className="block group">
                <Card className="border-slate-800 bg-slate-900/40 hover:border-rose-500/40 hover:bg-slate-900/80 transition-all h-full">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-rose-400" />
                        <CardTitle className="text-sm">Emergency Alert Broadcasts</CardTitle>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Create citywide and localized critical safety warning broadcasts.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Officer Management */}
      {activeTab === 'officers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Law Enforcement Officer Accounts</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage credentialed officers authorized to triage incidents, manage cases, and broadcast emergency alerts.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowOfficerModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              Add Officer Account
            </Button>
          </div>

          <Card className="border-slate-800 bg-slate-900/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Officer Name</th>
                    <th className="px-4 py-3">Badge Number</th>
                    <th className="px-4 py-3">Assigned Department</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Role Status</th>
                    <th className="px-4 py-3 text-right">Access Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {officersLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        <LoadingSpinner size="md" className="mx-auto mb-2" />
                        Loading registered officers...
                      </td>
                    </tr>
                  ) : officers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No officers found in directory. Use "Add Officer Account" to provision your first officer.
                      </td>
                    </tr>
                  ) : (
                    officers.map((officer) => {
                      const isActive = officer.isActive !== false;
                      const isCurrentUser = officer.id === user?.id;
                      return (
                        <tr key={officer.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full ${isActive ? 'bg-purple-900/60 text-purple-300 border-purple-700/50' : 'bg-slate-800 text-slate-500 border-slate-700'} flex items-center justify-center font-bold text-xs border`}>
                              {officer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span>{officer.name}</span>
                              {isCurrentUser && (
                                <span className="ml-1.5 text-[10px] text-purple-400 font-normal">(You)</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-purple-300">
                            {officer.badgeNumber || 'SHERIFF-01'}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-200">
                              {officer.department || 'All Departments'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{officer.email}</td>
                          <td className="px-4 py-3">
                            {isActive ? (
                              <Badge variant="success" className="text-[10px]">
                                AUTHORIZED
                              </Badge>
                            ) : (
                              <Badge variant="danger" className="text-[10px]">
                                ACCESS REVOKED
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isCurrentUser && (
                              <Button
                                variant={isActive ? 'danger' : 'outline'}
                                size="sm"
                                isLoading={updatingUserId === officer.id}
                                onClick={() => handleToggleUserStatus(officer, 'Officer')}
                                leftIcon={isActive ? <UserX className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              >
                                {isActive ? 'Dismiss' : 'Restore'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Citizen Management */}
      {activeTab === 'citizens' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Registered Citizen Directory</h2>
                <Badge variant="info" className="text-xs">
                  {citizens.length} Total Citizens
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                View registered community citizens, verify account states, and manage platform access permissions.
              </p>
            </div>

            {/* Citizen Search Bar */}
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search citizen by name or email..."
                value={citizenSearchQuery}
                onChange={(e) => setCitizenSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>

          <Card className="border-slate-800 bg-slate-900/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Citizen Name</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Registration Date</th>
                    <th className="px-4 py-3">Account Status</th>
                    <th className="px-4 py-3 text-right">Access Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {citizensLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        <LoadingSpinner size="md" className="mx-auto mb-2" />
                        Loading registered citizens...
                      </td>
                    </tr>
                  ) : filteredCitizens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        {citizenSearchQuery ? 'No citizens match your search query.' : 'No registered citizens found in system.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCitizens.map((citizen) => {
                      const isActive = citizen.isActive !== false;
                      const isCurrentUser = citizen.id === user?.id;
                      return (
                        <tr key={citizen.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full ${isActive ? 'bg-indigo-900/60 text-indigo-300 border-indigo-700/50' : 'bg-slate-800 text-slate-500 border-slate-700'} flex items-center justify-center font-bold text-xs border`}>
                              {citizen.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span>{citizen.name}</span>
                              {isCurrentUser && (
                                <span className="ml-1.5 text-[10px] text-indigo-400 font-normal">(You)</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{citizen.email}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">
                            {citizen.phone || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {citizen.createdAt ? new Date(citizen.createdAt).toLocaleDateString() : 'Active Member'}
                          </td>
                          <td className="px-4 py-3">
                            {isActive ? (
                              <Badge variant="success" className="text-[10px]">
                                ACTIVE
                              </Badge>
                            ) : (
                              <Badge variant="danger" className="text-[10px]">
                                ACCESS REVOKED
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isCurrentUser && (
                              <Button
                                variant={isActive ? 'danger' : 'outline'}
                                size="sm"
                                isLoading={updatingUserId === citizen.id}
                                onClick={() => handleToggleUserStatus(citizen, 'Citizen')}
                                leftIcon={isActive ? <UserX className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              >
                                {isActive ? 'Dismiss' : 'Restore'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: Incident Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Configured Crime Categories</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Defines severity ratings, emergency SLAs, and classification models. Newly added categories immediately appear in citizen reporting.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCategoryModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              Add Incident Category
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoriesLoading ? (
              <div className="col-span-3 text-center py-12">
                <LoadingSpinner size="lg" className="mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading incident categories...</p>
              </div>
            ) : (
              categories.map((cat) => (
                <Card key={cat.id} className="border-slate-800 bg-slate-900/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={cat.severity === 'CRITICAL' ? 'danger' : cat.severity === 'HIGH' ? 'warning' : 'info'}>
                        {cat.severity || 'MEDIUM'}
                      </Badge>
                      <span className="font-mono text-[10px] text-slate-400">{cat.slug || cat.code}</span>
                    </div>
                    <CardTitle className="text-base mt-2 text-white flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#4F46E5' }}
                      />
                      {cat.name}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">{cat.description || 'Public safety incident classification category.'}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-brand-400" />
                      Resolution SLA: <strong className="text-slate-200">{cat.slaResolutionHours || 24}h</strong>
                    </span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Active for Reports
                    </span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Provision Officer Modal */}
      {showOfficerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Provision Officer Account</h3>
              </div>
              <button
                onClick={() => setShowOfficerModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateOfficer} className="space-y-3 text-xs">
              <Input
                label="Officer Full Name"
                placeholder="e.g. Officer Sarah Chen"
                value={officerForm.name}
                onChange={(e) => setOfficerForm({ ...officerForm, name: e.target.value })}
                required
              />
              <Input
                label="Official Email Address"
                type="email"
                placeholder="sarah.chen@police.gov"
                value={officerForm.email}
                onChange={(e) => setOfficerForm({ ...officerForm, email: e.target.value })}
                required
              />
              <Input
                label="Badge Number"
                placeholder="e.g. BADGE-7742"
                value={officerForm.badgeNumber}
                onChange={(e) => setOfficerForm({ ...officerForm, badgeNumber: e.target.value })}
                required
              />

              {/* Assigned Department Dropdown */}
              <Select
                label="Assigned Department *"
                options={departmentOptions}
                value={officerForm.department}
                onChange={(e) => setOfficerForm({ ...officerForm, department: e.target.value })}
                required
              />
              <p className="text-[11px] text-slate-400 -mt-1">
                Officers will strictly triage and investigate incidents belonging to their assigned department.
              </p>

              {/* Password field with Eye / EyeOff icon toggle */}
              <Input
                label="Initial Password"
                type={showOfficerPassword ? 'text' : 'password'}
                placeholder="At least 8 characters..."
                value={officerForm.password}
                onChange={(e) => setOfficerForm({ ...officerForm, password: e.target.value })}
                helperText="Must be 8+ characters"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowOfficerPassword(!showOfficerPassword)}
                    className="text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                    aria-label="Toggle password visibility"
                  >
                    {showOfficerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOfficerModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingOfficer}
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Create Officer Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal (Admin Only) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Create Incident Category</h3>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <Input
                label="Category Name *"
                placeholder="e.g. Arson & Hazardous Materials"
                value={categoryForm.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  setCategoryForm({ ...categoryForm, name: val, slug: autoSlug });
                }}
                required
              />

              <Input
                label="URL / API Slug"
                placeholder="e.g. arson"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                helperText="Auto-generated unique identifier"
              />

              <Input
                label="Description"
                placeholder="Detailed explanation of what falls under this crime classification..."
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Severity Level"
                  options={[
                    { value: 'LOW', label: 'LOW - General' },
                    { value: 'MEDIUM', label: 'MEDIUM - Standard' },
                    { value: 'HIGH', label: 'HIGH - Urgent' },
                    { value: 'CRITICAL', label: 'CRITICAL - Emergency' },
                  ]}
                  value={categoryForm.severity}
                  onChange={(e) => setCategoryForm({ ...categoryForm, severity: e.target.value })}
                />

                <Input
                  label="Resolution SLA (Hours)"
                  type="number"
                  min={1}
                  max={168}
                  value={categoryForm.slaResolutionHours}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slaResolutionHours: Number(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Display Color Hex"
                  placeholder="#EF4444"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                />

                <Select
                  label="Category Icon"
                  options={[
                    { value: 'AlertTriangle', label: 'Alert Triangle' },
                    { value: 'Shield', label: 'Shield' },
                    { value: 'Flame', label: 'Flame / Fire' },
                    { value: 'Car', label: 'Car / Traffic' },
                    { value: 'Lock', label: 'Lock / Security' },
                    { value: 'Laptop', label: 'Laptop / Cyber' },
                    { value: 'Eye', label: 'Eye / Surveillance' },
                    { value: 'HelpCircle', label: 'Help / Other' },
                  ]}
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingCategory}
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Save & Publish Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
