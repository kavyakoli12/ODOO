import mongoose from 'mongoose';
import { Incident } from '../models/Incident.js';
import { Investigation } from '../models/Investigation.js';

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  status?: string;
  area?: string;
  groupBy?: 'day' | 'week' | 'month';
}

function buildMatchStage(filters?: AnalyticsFilters) {
  const match: any = {};
  if (!filters) return match;

  if (filters.startDate || filters.endDate) {
    match.createdAt = {};
    if (filters.startDate) match.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) match.createdAt.$lte = new Date(filters.endDate);
  }

  if (filters.category && filters.category !== 'all') {
    match.categoryName = filters.category;
  }

  if (filters.status && filters.status !== 'all') {
    match.status = filters.status;
  }

  if (filters.area && filters.area.trim() !== '') {
    match.address = { $regex: filters.area.trim(), $options: 'i' };
  }

  return match;
}

// ---- In-memory demo data fallback ----
function getDemoAnalytics(filters?: AnalyticsFilters) {
  const now = new Date();
  const trendLength = filters?.groupBy === 'month' ? 6 : filters?.groupBy === 'week' ? 8 : 14;
  
  const trend = Array.from({ length: trendLength }, (_, i) => {
    const d = new Date(now);
    if (filters?.groupBy === 'month') {
      d.setMonth(d.getMonth() - (trendLength - 1 - i));
      return {
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        count: Math.floor(Math.random() * 25) + 10,
      };
    } else if (filters?.groupBy === 'week') {
      d.setDate(d.getDate() - (trendLength - 1 - i) * 7);
      return {
        date: `Week ${i + 1} (${d.getMonth() + 1}/${d.getDate()})`,
        count: Math.floor(Math.random() * 18) + 5,
      };
    } else {
      d.setDate(d.getDate() - (trendLength - 1 - i));
      return {
        date: d.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 8) + 1,
      };
    }
  });

  const timeOfDay = [
    { slot: 'Night (00:00-06:00)', count: 6 },
    { slot: 'Morning (06:00-12:00)', count: 14 },
    { slot: 'Afternoon (12:00-18:00)', count: 18 },
    { slot: 'Evening (18:00-24:00)', count: 11 },
  ];

  const resolutionTrends = [
    { period: '2 Weeks Ago', resolvedCount: 5, avgDaysToResolve: 2.4 },
    { period: 'Last Week', resolvedCount: 9, avgDaysToResolve: 1.8 },
    { period: 'This Week', resolvedCount: 14, avgDaysToResolve: 1.5 },
  ];

  const mapPoints = [
    { id: 'p1', lat: 28.6139, lng: 77.2090, type: 'citizen_report', title: 'Suspicious vehicle near Park', category: 'Suspicious Activity', status: 'submitted' },
    { id: 'p2', lat: 28.6289, lng: 77.2150, type: 'citizen_report', title: 'Noise complaint', category: 'Nuisance', status: 'under_review' },
    { id: 'p3', lat: 28.6353, lng: 77.2250, type: 'verified_incident', title: 'Commercial Theft', category: 'Theft & Burglary', status: 'verified' },
    { id: 'p4', lat: 28.6010, lng: 77.2190, type: 'verified_incident', title: 'Traffic collision', category: 'Traffic Incident', status: 'verified' },
    { id: 'p5', lat: 28.6410, lng: 77.2100, type: 'citizen_report', title: 'Vandalism at bus stop', category: 'Vandalism', status: 'submitted' },
    { id: 'p6', lat: 28.6210, lng: 77.2300, type: 'verified_incident', title: 'Chain snatching', category: 'Theft & Burglary', status: 'verified' },
  ];

  return {
    summary: {
      totalReports: 42,
      verifiedReports: 18,
      rejectedReports: 6,
      pendingReports: 11,
      underReviewReports: 7,
      openInvestigations: 9,
      resolvedInvestigations: 14,
      closedInvestigations: 5,
    },
    byCategory: [
      { category: 'Theft & Burglary', count: 12 },
      { category: 'Vandalism', count: 8 },
      { category: 'Suspicious Activity', count: 7 },
      { category: 'Traffic Incident', count: 6 },
      { category: 'Missing Person', count: 5 },
      { category: 'Assault', count: 4 },
    ],
    byStatus: [
      { status: 'submitted', count: 11 },
      { status: 'under_review', count: 7 },
      { status: 'verified', count: 18 },
      { status: 'rejected', count: 6 },
    ],
    trend,
    timeOfDay,
    resolutionTrends,
    topAreas: [
      { area: 'Connaught Place', count: 9 },
      { area: 'Lajpat Nagar', count: 7 },
      { area: 'Karol Bagh', count: 6 },
      { area: 'Saket', count: 5 },
      { area: 'Dwarka Sector 12', count: 4 },
    ],
    mapPoints,
  };
}

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// ---------------------------------------------------------------------------
// Summary stats with filters
// ---------------------------------------------------------------------------
export async function getAnalyticsSummary(filters?: AnalyticsFilters) {
  if (!isMongoConnected()) return getDemoAnalytics(filters).summary;

  const match = buildMatchStage(filters);

  const [
    totalReports,
    verifiedReports,
    rejectedReports,
    pendingReports,
    underReviewReports,
    openInvestigations,
    resolvedInvestigations,
    closedInvestigations,
  ] = await Promise.all([
    Incident.countDocuments(match),
    Incident.countDocuments({ ...match, status: 'verified' }),
    Incident.countDocuments({ ...match, status: 'rejected' }),
    Incident.countDocuments({ ...match, status: 'submitted' }),
    Incident.countDocuments({ ...match, status: 'under_review' }),
    Investigation.countDocuments({ status: { $in: ['open', 'ongoing'] } }),
    Investigation.countDocuments({ status: 'resolved' }),
    Investigation.countDocuments({ status: 'closed' }),
  ]);

  return {
    totalReports,
    verifiedReports,
    rejectedReports,
    pendingReports,
    underReviewReports,
    openInvestigations,
    resolvedInvestigations,
    closedInvestigations,
  };
}

// ---------------------------------------------------------------------------
// Incidents by category
// ---------------------------------------------------------------------------
export async function getIncidentsByCategory(filters?: AnalyticsFilters) {
  if (!isMongoConnected()) return getDemoAnalytics(filters).byCategory;

  const match = buildMatchStage(filters);

  const result = await Incident.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$categoryName',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        category: { $ifNull: ['$_id', 'Uncategorised'] },
        count: 1,
      },
    },
  ]);

  return result;
}

// ---------------------------------------------------------------------------
// Incidents by status
// ---------------------------------------------------------------------------
export async function getIncidentsByStatus(filters?: AnalyticsFilters) {
  if (!isMongoConnected()) return getDemoAnalytics(filters).byStatus;

  const match = buildMatchStage(filters);

  const result = await Incident.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
  ]);

  return result;
}

// ---------------------------------------------------------------------------
// Incidents trend (day, week, month)
// ---------------------------------------------------------------------------
export async function getIncidentsTrend(filters?: AnalyticsFilters, days = 14) {
  if (!isMongoConnected()) return getDemoAnalytics(filters).trend;

  const match = buildMatchStage(filters);
  if (!match.createdAt) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    match.createdAt = { $gte: since };
  }

  const format =
    filters?.groupBy === 'month'
      ? '%Y-%m'
      : filters?.groupBy === 'week'
      ? '%G-W%V'
      : '%Y-%m-%d';

  const result = await Incident.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format, date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', count: 1 } },
  ]);

  return result;
}

// ---------------------------------------------------------------------------
// Time of Day distribution
// ---------------------------------------------------------------------------
export async function getIncidentsByTimeOfDay(filters?: AnalyticsFilters) {
  if (!isMongoConnected()) return getDemoAnalytics(filters).timeOfDay;

  const match = buildMatchStage(filters);

  const result = await Incident.aggregate([
    { $match: match },
    {
      $project: {
        hour: { $hour: '$createdAt' },
      },
    },
    {
      $project: {
        slot: {
          $switch: {
            branches: [
              { case: { $and: [{ $gte: ['$hour', 0] }, { $lt: ['$hour', 6] }] }, then: 'Night (00:00-06:00)' },
              { case: { $and: [{ $gte: ['$hour', 6] }, { $lt: ['$hour', 12] }] }, then: 'Morning (06:00-12:00)' },
              { case: { $and: [{ $gte: ['$hour', 12] }, { $lt: ['$hour', 18] }] }, then: 'Afternoon (12:00-18:00)' },
            ],
            default: 'Evening (18:00-24:00)',
          },
        },
      },
    },
    {
      $group: {
        _id: '$slot',
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, slot: '$_id', count: 1 } },
  ]);

  return result;
}

// ---------------------------------------------------------------------------
// Resolution trends
// ---------------------------------------------------------------------------
export async function getResolutionTrends(filters?: AnalyticsFilters) {
  if (!isMongoConnected()) return getDemoAnalytics(filters).resolutionTrends;

  const result = await Investigation.aggregate([
    { $match: { status: 'resolved' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } },
        resolvedCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: '$_id', resolvedCount: 1 } },
  ]);

  return result;
}

// ---------------------------------------------------------------------------
// Top geographic areas
// ---------------------------------------------------------------------------
export async function getTopAreas(filters?: AnalyticsFilters, limit = 5) {
  if (!isMongoConnected()) return getDemoAnalytics(filters).topAreas;

  const match = buildMatchStage(filters);
  match.address = { $exists: true, $ne: '' };

  const result = await Incident.aggregate([
    { $match: match },
    { $group: { _id: '$address', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, area: '$_id', count: 1 } },
  ]);

  return result;
}

// ---------------------------------------------------------------------------
// Map analytics data (heatmap & point markers with citizen vs verified breakdown)
// ---------------------------------------------------------------------------
export async function getMapAnalyticsData(filters?: AnalyticsFilters) {
  if (!isMongoConnected()) return getDemoAnalytics(filters).mapPoints;

  const match = buildMatchStage(filters);
  match.location = { $exists: true };

  const incidents = await Incident.find(match)
    .select('title categoryName status location address createdAt')
    .limit(200)
    .lean();

  return incidents
    .filter((inc) => inc.location && Array.isArray(inc.location.coordinates) && inc.location.coordinates.length === 2)
    .map((inc) => ({
      id: inc._id.toString(),
      lat: inc.location.coordinates[1],
      lng: inc.location.coordinates[0],
      type: inc.status === 'verified' ? 'verified_incident' : 'citizen_report',
      title: inc.title,
      category: inc.categoryName || 'General',
      status: inc.status,
    }));
}

// ---------------------------------------------------------------------------
// Full analytics bundle
// ---------------------------------------------------------------------------
export async function getFullAnalytics(filters?: AnalyticsFilters) {
  if (!isMongoConnected()) return getDemoAnalytics(filters);

  const [summary, byCategory, byStatus, trend, timeOfDay, resolutionTrends, topAreas, mapPoints] = await Promise.all([
    getAnalyticsSummary(filters),
    getIncidentsByCategory(filters),
    getIncidentsByStatus(filters),
    getIncidentsTrend(filters, 14),
    getIncidentsByTimeOfDay(filters),
    getResolutionTrends(filters),
    getTopAreas(filters, 5),
    getMapAnalyticsData(filters),
  ]);

  return { summary, byCategory, byStatus, trend, timeOfDay, resolutionTrends, topAreas, mapPoints };
}
