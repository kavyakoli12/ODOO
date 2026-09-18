import { useState } from 'react';
import {
  Search,
  Filter,
  X,
  RotateCcw,
  ShieldCheck,
  Clock,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui';
import type { MapFilterState } from '@/types/map';
import type { IncidentCategory } from '@/types/incident';

interface MapFiltersProps {
  filters: MapFilterState;
  onChange: (filters: MapFilterState) => void;
  categories: IncidentCategory[];
  totalCount: number;
  isLoading?: boolean;
}

export function MapFilters({
  filters,
  onChange,
  categories,
  totalCount,
  isLoading,
}: MapFiltersProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.status !== 'all' ||
    filters.timeRange !== 'all' ||
    filters.searchQuery.trim() !== '';

  const handleReset = () => {
    onChange({
      category: 'all',
      status: 'all',
      timeRange: 'all',
      searchQuery: '',
    });
  };

  const filterContent = (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
          placeholder="Search by title, location, or INC-ID..."
          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
        />
        {filters.searchQuery && (
          <button
            onClick={() => onChange({ ...filters, searchQuery: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Category Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Category
          </label>
          <div className="relative">
            <select
              value={filters.category}
              onChange={(e) => onChange({ ...filters, category: e.target.value })}
              className="w-full appearance-none px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer pr-8"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id || cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Verification Status Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Verification Status
          </label>
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => onChange({ ...filters, status: e.target.value })}
              className="w-full appearance-none px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer pr-8"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified / Official Only</option>
              <option value="submitted">Citizen Reported (Unverified)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Time Window Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Incident Window
          </label>
          <div className="relative">
            <select
              value={filters.timeRange}
              onChange={(e) => onChange({ ...filters, timeRange: e.target.value })}
              className="w-full appearance-none px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer pr-8"
            >
              <option value="all">All Time</option>
              <option value="24h">Past 24 Hours</option>
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Footer bar with summary count and reset */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-medium">
            <Layers className="w-3 h-3 text-brand-400" />
            {isLoading ? 'Searching...' : `${totalCount} incidents in view`}
          </span>
          {filters.status === 'verified' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              Verified Only
            </span>
          )}
          {filters.status === 'submitted' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
              <Clock className="w-3 h-3" />
              Unverified Only
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Floating Filter Bar */}
      <div className="hidden md:block absolute top-4 left-4 right-4 z-[1000] max-w-4xl mx-auto">
        <div className="p-3.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 shadow-2xl">
          {filterContent}
        </div>
      </div>

      {/* Mobile Floating Toggle Button */}
      <div className="md:hidden absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsMobileOpen(true)}
          className="bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-xl text-white flex-1 justify-between"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-400" />
            Filters & Search
          </span>
          <span className="px-1.5 py-0.2 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold">
            {totalCount}
          </span>
        </Button>
      </div>

      {/* Mobile Slide-Up Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-[1500] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative z-10 p-5 rounded-t-3xl bg-slate-950 border-t border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-white">Map Filters & Search</h3>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {filterContent}

            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => setIsMobileOpen(false)}
            >
              Apply Filters ({totalCount} results)
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
