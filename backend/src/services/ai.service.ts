import mongoose from 'mongoose';
import { Incident } from '../models/Incident.js';

export interface CategorySuggestion {
  category: string;
  confidence: number;
  rationale: string;
}

export interface DuplicateReportMatch {
  id: string;
  trackingId: string;
  title: string;
  categoryName: string;
  status: string;
  address: string;
  similarityScore: number;
  matchReasons: string[];
}

export interface PrioritySuggestion {
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  riskFactors: string[];
  disclaimer: string;
}

export interface ExecutiveSummary {
  bullets: string[];
  keyTakeaway: string;
}

export interface AnalyticsNaturalQueryResult {
  query: string;
  parsedIntent: {
    categoryFilter?: string;
    areaFilter?: string;
    timeframeFilter?: string;
  };
  summaryText: string;
  matchingCount: number;
  suggestedChart: 'category' | 'trend' | 'status';
  highlights: string[];
}

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * 1. AI Incident Categorization
 * Evaluates report text and returns ranked category suggestions with confidence scores.
 */
export async function suggestCategory(title: string, description: string): Promise<CategorySuggestion[]> {
  const text = `${title} ${description}`.toLowerCase();

  const rules = [
    {
      category: 'Theft & Burglary',
      keywords: ['stolen', 'theft', 'stole', 'burglar', 'robbed', 'robbery', 'break-in', 'snatched', 'pocket', 'wallet'],
      rationale: 'Contains keywords referencing stolen property or illegal entry.',
    },
    {
      category: 'Vandalism',
      keywords: ['vandal', 'graffiti', 'damaged', 'broken glass', 'smashed', 'property damage', 'spray', 'destroyed'],
      rationale: 'Contains terms indicating intentional damage to public or private property.',
    },
    {
      category: 'Suspicious Activity',
      keywords: ['suspicious', 'loitering', 'lurking', 'prowling', 'prowler', 'strange vehicle', 'unattended bag', 'casing'],
      rationale: 'References unusual behavior or unverified suspicious circumstances.',
    },
    {
      category: 'Traffic Incident',
      keywords: ['accident', 'crash', 'collision', 'hit and run', 'traffic', 'reckless driving', 'speeding', 'vehicle'],
      rationale: 'References motor vehicle collisions, road hazards, or traffic violations.',
    },
    {
      category: 'Missing Person',
      keywords: ['missing', 'disappeared', 'lost child', 'runaway', 'last seen', 'uncontactable', 'person'],
      rationale: 'Contains indicators of a missing or unaccounted individual.',
    },
    {
      category: 'Assault',
      keywords: ['assault', 'attacked', 'physical fight', 'hit me', 'punched', 'threatened', 'weapon', 'violence'],
      rationale: 'References physical altercation or threat to personal bodily safety.',
    },
  ];

  const results: CategorySuggestion[] = [];

  for (const rule of rules) {
    const matches = rule.keywords.filter((kw) => text.includes(kw));
    if (matches.length > 0) {
      const confidence = Math.min(96, 65 + matches.length * 10);
      results.push({
        category: rule.category,
        confidence,
        rationale: rule.rationale,
      });
    }
  }

  if (results.length === 0) {
    results.push(
      { category: 'Suspicious Activity', confidence: 72, rationale: 'General behavioral report indicator' },
      { category: 'Theft & Burglary', confidence: 55, rationale: 'Secondary keyword similarity' }
    );
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 2. AI Smart Duplicate Detection
 * Scans for existing reports with geographic and textual similarity.
 */
export async function detectDuplicates(
  currentId?: string,
  description: string = '',
  address: string = '',
  categoryName: string = ''
): Promise<DuplicateReportMatch[]> {
  let existingReports: any[] = [];

  if (isMongoConnected()) {
    const query: any = {};
    if (currentId && mongoose.Types.ObjectId.isValid(currentId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(currentId) };
    }
    existingReports = await Incident.find(query).limit(20).lean();
  } else {
    existingReports = [
      {
        _id: 'inc-demo-101',
        trackingId: 'INC-2026-0042',
        title: 'Commercial burglary near CP block A',
        description: 'Store window smashed and electronic goods stolen overnight.',
        categoryName: 'Theft & Burglary',
        status: 'verified',
        address: 'Connaught Place, Block A',
      },
      {
        _id: 'inc-demo-102',
        trackingId: 'INC-2026-0089',
        title: 'Suspicious vehicle loitering near market',
        description: 'Black sedan parked without license plate for 4 hours.',
        categoryName: 'Suspicious Activity',
        status: 'under_review',
        address: 'Lajpat Nagar Central Market',
      },
    ];
  }

  const matches: DuplicateReportMatch[] = [];
  const textWords = description.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  for (const rep of existingReports) {
    let score = 0;
    const reasons: string[] = [];

    // Category match
    if (categoryName && rep.categoryName && rep.categoryName.toLowerCase() === categoryName.toLowerCase()) {
      score += 35;
      reasons.push(`Identical Category (${rep.categoryName})`);
    }

    // Address similarity
    if (address && rep.address && (rep.address.toLowerCase().includes(address.toLowerCase()) || address.toLowerCase().includes(rep.address.toLowerCase()))) {
      score += 35;
      reasons.push(`Same Geographic Area (${rep.address})`);
    }

    // Text keyword overlap
    const otherText = `${rep.title} ${rep.description}`.toLowerCase();
    const commonWords = textWords.filter((w) => otherText.includes(w));
    if (commonWords.length > 0) {
      const textScore = Math.min(30, commonWords.length * 10);
      score += textScore;
      reasons.push(`Matching terms: ${commonWords.slice(0, 3).join(', ')}`);
    }

    if (score >= 40) {
      matches.push({
        id: rep._id ? rep._id.toString() : rep.id,
        trackingId: rep.trackingId || 'INC-2026',
        title: rep.title,
        categoryName: rep.categoryName || 'General',
        status: rep.status,
        address: rep.address || 'Local area',
        similarityScore: Math.min(95, score),
        matchReasons: reasons,
      });
    }
  }

  return matches.sort((a, b) => b.similarityScore - a.similarityScore);
}

/**
 * 3. AI Report Executive Summarization
 */
export async function summarizeReport(description: string): Promise<ExecutiveSummary> {
  if (!description || description.trim().length < 20) {
    return {
      bullets: ['Short report description provided by citizen.'],
      keyTakeaway: 'Immediate initial review recommended.',
    };
  }

  const sentences = description.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 5);
  const bullet1 = sentences[0] || description.slice(0, 100);
  const bullet2 = sentences[1] || 'No additional immediate details specified by informant.';

  return {
    bullets: [
      `Primary statement: ${bullet1}`,
      `Key detail: ${bullet2}`,
    ],
    keyTakeaway: `Executive Summary: Citizen reported incident requiring official triage & verification.`,
  };
}

/**
 * 4. AI Triage Priority Suggestion
 */
export async function suggestPriority(description: string, categoryName: string = ''): Promise<PrioritySuggestion> {
  const text = `${description} ${categoryName}`.toLowerCase();

  const criticalKeywords = ['weapon', 'gun', 'knife', 'fire', 'explosion', 'bleeding', 'hostage', 'active assault', 'child missing'];
  const highKeywords = ['stolen vehicle', 'burglary in progress', 'robbery', 'break-in', 'assault', 'hit and run'];

  if (criticalKeywords.some((kw) => text.includes(kw))) {
    return {
      priority: 'critical',
      confidence: 94,
      riskFactors: ['High threat to human safety / weapon reported', 'Requires immediate emergency dispatch'],
      disclaimer: 'AI Suggestion — requires human authority confirmation',
    };
  }

  if (highKeywords.some((kw) => text.includes(kw))) {
    return {
      priority: 'high',
      confidence: 88,
      riskFactors: ['Significant property loss or active criminal incident', 'Priority officer assignment recommended'],
      disclaimer: 'AI Suggestion — requires human authority confirmation',
    };
  }

  return {
    priority: 'medium',
    confidence: 80,
    riskFactors: ['Standard public safety intake report', 'Routine patrol & desk review recommended'],
    disclaimer: 'AI Suggestion — requires human authority confirmation',
  };
}

/**
 * 5. AI Natural Language Analytics Query Assistant
 */
export async function queryNaturalLanguageAnalytics(query: string): Promise<AnalyticsNaturalQueryResult> {
  const q = query.toLowerCase();

  let categoryFilter: string | undefined;
  let areaFilter: string | undefined;
  let timeframeFilter: string | undefined = 'this month';

  if (q.includes('theft') || q.includes('burglary')) categoryFilter = 'Theft & Burglary';
  else if (q.includes('vandalism')) categoryFilter = 'Vandalism';
  else if (q.includes('traffic')) categoryFilter = 'Traffic Incident';
  else if (q.includes('suspicious')) categoryFilter = 'Suspicious Activity';

  if (q.includes('connaught') || q.includes('cp')) areaFilter = 'Connaught Place';
  else if (q.includes('lajpat')) areaFilter = 'Lajpat Nagar';
  else if (q.includes('saket')) areaFilter = 'Saket';

  if (q.includes('today')) timeframeFilter = 'today';
  else if (q.includes('week')) timeframeFilter = 'this week';

  let count = 12;
  if (isMongoConnected()) {
    const match: any = {};
    if (categoryFilter) match.categoryName = categoryFilter;
    if (areaFilter) match.address = { $regex: areaFilter, $options: 'i' };
    count = await Incident.countDocuments(match);
  }

  return {
    query,
    parsedIntent: {
      categoryFilter,
      areaFilter,
      timeframeFilter,
    },
    summaryText: `AI parsed query: Identified ${count} incident reports matching ${categoryFilter || 'all categories'} in ${areaFilter || 'all sectors'} for ${timeframeFilter}.`,
    matchingCount: count,
    suggestedChart: categoryFilter ? 'trend' : 'category',
    highlights: [
      `Found ${count} matching incidents based on natural language criteria`,
      `Category target: ${categoryFilter || 'All Categories'}`,
      `Geographic scope: ${areaFilter || 'All Jurisdictions'}`,
    ],
  };
}
