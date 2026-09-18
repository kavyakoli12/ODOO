import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Inbox, PlusCircle, Search, RefreshCw } from 'lucide-react';
import { Button, Input, Select, LoadingSpinner, Card } from '@/components/ui';
import { IncidentCard } from '@/components/incidents/IncidentCard';
import type { Incident } from '@/types/incident';

export function MyReportsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchMyReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/incidents/mine');
      if (res.data.success && res.data.data) {
        setIncidents(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch user reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        categoryFilter === 'all' ||
        inc.categoryName.toLowerCase().includes(categoryFilter.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [incidents, searchQuery, categoryFilter]);

  return (
    <div className="space-y-6 py-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-brand-400" />
            My Incident Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track all incident submissions associated with your citizen account
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMyReports}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Link to="/citizen/report" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="w-full"
            >
              Report Incident
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by title, tracking ID (e.g. INC-2026), or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="w-full sm:w-64">
          <Select
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'theft', label: 'Theft / Burglary' },
              { value: 'robbery', label: 'Robbery' },
              { value: 'assault', label: 'Assault' },
              { value: 'vandalism', label: 'Vandalism' },
              { value: 'suspicious', label: 'Suspicious Activity' },
              { value: 'traffic', label: 'Traffic Incident' },
              { value: 'missing', label: 'Missing Person' },
              { value: 'cybercrime', label: 'Cybercrime' },
              { value: 'other', label: 'Other' },
            ]}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Incident List Content */}
      {isLoading ? (
        <div className="py-16">
          <LoadingSpinner size="lg" label="Retrieving your private reports..." />
        </div>
      ) : filteredIncidents.length === 0 ? (
        <Card className="text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No Incident Reports Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
            {searchQuery || categoryFilter !== 'all'
              ? 'No reports match your current search or filter criteria.'
              : 'You have not submitted any incident reports yet. Help keep your neighborhood safe by reporting suspicious or criminal incidents.'}
          </p>
          <Link to="/citizen/report">
            <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Submit Your First Report
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredIncidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}
