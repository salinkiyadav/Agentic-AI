import { DatasetMeta } from '../types.ts';

export const DATASET_METAS: DatasetMeta[] = [
  {
    id: 'retail_growth',
    name: 'Retail Shops & Consumer Revenue Growth Intelligence',
    description: 'B2B retail shops and consumer revenue telemetry tracking actual vs expected revenue, growth trajectories (Growing vs Declining), customer health scores, and retention focus priorities.',
    category: 'Retail & Consumer Analytics',
    totalRecords: 650,
    injectedFlaws: [
      {
        type: 'inconsistent_casing',
        description: 'consumer_segment has mixed casing: "Retail Shop", "retail shop", "RETAIL", "Direct Consumer", "direct consumer". growth_trajectory has "Growing", "growing", "Declining", "declining", "DECLINING".',
        affectedFields: ['consumer_segment', 'growth_trajectory'],
        impact: 'Case-sensitive exact queries miss over 50% of declining or retail shop customers.'
      },
      {
        type: 'missing_values',
        description: '32 merchant accounts have null expected_revenue_ytd (unassigned quota/target), and 40 declining accounts have null primary_decline_reason.',
        affectedFields: ['expected_revenue_ytd', 'primary_decline_reason'],
        impact: 'Direct calculations of shortfall (expected - actual) cause arithmetic null errors without $ifNull or $match.'
      },
      {
        type: 'outlier_values',
        description: '4 merchant accounts have negative actual_revenue_ytd (-$1,200 to -$3,500) due to bulk inventory return chargebacks, and 2 accounts have corrupted health scores (-999).',
        affectedFields: ['actual_revenue_ytd', 'customer_health_score'],
        impact: 'Skewed revenue totals and averages unless sanitized by filtering valid positive metrics.'
      },
      {
        type: 'duplicate_records',
        description: '14 duplicate shop rows simulating POS/ERP sync retries without idempotent deduplication keys.',
        affectedFields: ['shop_id'],
        impact: 'Simple row count overstates active customer merchant count.'
      },
      {
        type: 'date_format_inconsistency',
        description: 'last_order_date stored in mixed YYYY-MM-DD and MM/DD/YYYY date string formats.',
        affectedFields: ['last_order_date'],
        impact: 'Direct string date sorting fails without standardized parsing.'
      }
    ]
  },
  {
    id: 'bike_trips',
    name: 'NYC Urban Mobility (CitiBike Rides)',
    description: 'Micromobility trip logs with intentionally injected messy data: mixed casing user types, missing end stations, duplicate trip IDs, and negative duration anomalies.',
    category: 'Transportation & Mobility',
    totalRecords: 600,
    injectedFlaws: [
      {
        type: 'missing_values',
        description: '35 trips have null or empty end_station_name representing lost connection or unmonitored drop-offs.',
        affectedFields: ['end_station_name'],
        impact: 'Naive aggregations over stations will produce null groups or skewed counts.'
      },
      {
        type: 'inconsistent_casing',
        description: 'user_type has values "Subscriber", "subscriber", "Sub", "Customer", "cust".',
        affectedFields: ['user_type'],
        impact: 'Case-sensitive exact matching filters will miss 40%+ of rider records.'
      },
      {
        type: 'duplicate_records',
        description: '15 duplicated trip_id records simulating webhook retries.',
        affectedFields: ['trip_id'],
        impact: 'Simple $count stage over-counts trip volume without deduplication.'
      },
      {
        type: 'date_format_inconsistency',
        description: 'start_time is stored in mixed formats: ISO 8601 strings and YYYY-MM-DD HH:mm:ss strings.',
        affectedFields: ['start_time', 'end_time'],
        impact: 'Direct date comparisons require robust parsing or string slicing.'
      },
      {
        type: 'outlier_values',
        description: '5 records have negative duration_sec (-45s to -120s) due to GPS clock drift, and 2 have extreme outlier durations (999999s).',
        affectedFields: ['duration_sec'],
        impact: 'Raw $avg duration produces misleading or negative statistics without quality guardrails.'
      }
    ]
  },
  {
    id: 'saas_sales',
    name: 'SaaS B2B Subscriptions & Revenue',
    description: 'Enterprise subscription telemetry with dirty data: inconsistent country naming, null MRR on trial conversions, duplicate accounts, and outlier seat counts.',
    category: 'Finance & B2B SaaS',
    totalRecords: 500,
    injectedFlaws: [
      {
        type: 'inconsistent_casing',
        description: 'country contains mixed representations: "USA", "United States", "US", "U.S.", "uk", "United Kingdom", "GB".',
        affectedFields: ['country'],
        impact: 'Geographic revenue aggregations fragment into duplicate buckets.'
      },
      {
        type: 'missing_values',
        description: '28 freemium and trial accounts have null mrr_usd instead of 0.',
        affectedFields: ['mrr_usd'],
        impact: 'Summing MRR can drop records or cause arithmetic null bugs.'
      },
      {
        type: 'duplicate_records',
        description: '12 accounts exist multiple times due to upgrade events without point-in-time snapshot keys.',
        affectedFields: ['account_id'],
        impact: 'Account count is inflated by ~2.5%.'
      },
      {
        type: 'outlier_values',
        description: 'Test accounts have -1 seats or negative NPS scores (-999).',
        affectedFields: ['seats', 'nps_score'],
        impact: 'Skewed averages unless sanitized with filter stages.'
      }
    ]
  },
  {
    id: 'retail_orders',
    name: 'Global Retail Commerce Orders',
    description: 'Multi-category retail transactions with status casing anomalies, null discount rates, and negative return profit.',
    category: 'E-Commerce & Retail',
    totalRecords: 550,
    injectedFlaws: [
      {
        type: 'inconsistent_casing',
        description: 'order_status has variants "Delivered", "delivered", "DELIVERED", "Pending", "pending", "Cancelled".',
        affectedFields: ['order_status'],
        impact: 'Fulfillment analytics miss records without case-insensitive matching.'
      },
      {
        type: 'missing_values',
        description: '45 orders have null discount_pct instead of 0.0.',
        affectedFields: ['discount_pct'],
        impact: 'Discount-weighted margin calculations result in null values.'
      },
      {
        type: 'inconsistent_casing',
        description: 'category has "Technology", "tech", "Office Supplies", "office supplies", "Furniture".',
        affectedFields: ['category'],
        impact: 'Category drilldown creates duplicate groups.'
      }
    ]
  }
];

// Helper to generate realistic bike trips
export function generateBikeTrips(): any[] {
  const stations = [
    'Central Park West & 72nd St',
    'Broadway & W 53rd St',
    'Union Square E & E 15th St',
    '8th Ave & W 31st St',
    'Grand Central Terminal',
    'Columbus Circle & 8th Ave',
    'Times Square North',
    'FDR Drive & E 34th St',
    'Brooklyn Bridge Promenade',
    'West St & Chambers St'
  ];

  const bikeTypes = ['classic_bike', 'electric_bike', 'dockless_e_bike'];
  const userTypeVariants = ['Subscriber', 'subscriber', 'Sub', 'Customer', 'cust'];
  const genders = ['Male', 'Female', 'Unknown'];

  const records: any[] = [];
  const baseDate = new Date('2024-06-01T08:00:00Z');

  for (let i = 1; i <= 600; i++) {
    const startStation = stations[i % stations.length];
    // Injected flaw 1: Missing end station in 35 records
    const isMissingEnd = (i % 17 === 0);
    const endStation = isMissingEnd ? null : stations[(i * 3) % stations.length];

    // Injected flaw 2: Inconsistent casing for user_type
    const userType = userTypeVariants[i % userTypeVariants.length];

    // Injected flaw 3: Dates in mixed formats
    const tripDate = new Date(baseDate.getTime() + (i * 3600 * 1000 * 1.5));
    const isIso = i % 2 === 0;
    const startStr = isIso 
      ? tripDate.toISOString() 
      : tripDate.toISOString().replace('T', ' ').substring(0, 19);

    // Duration calculation with injected flaw 5: negative and extreme outliers
    let durationSec = Math.floor(200 + (Math.sin(i) + 1) * 600);
    if (i === 42 || i === 128) durationSec = -60; // Clock drift anomaly
    if (i === 305) durationSec = -120;
    if (i === 99) durationSec = 999999; // Abandoned bike anomaly

    const endTripDate = new Date(tripDate.getTime() + Math.max(0, durationSec) * 1000);
    const endStr = isIso ? endTripDate.toISOString() : endTripDate.toISOString().replace('T', ' ').substring(0, 19);

    const tripId = `TRIP-${10000 + i}`;

    records.push({
      trip_id: tripId,
      start_time: startStr,
      end_time: endStr,
      duration_sec: durationSec,
      start_station_name: startStation,
      end_station_name: endStation,
      user_type: userType,
      user_gender: genders[i % genders.length],
      birth_year: 1970 + (i % 35),
      bike_type: bikeTypes[i % bikeTypes.length],
      fare_amount: Number((3.5 + (durationSec > 0 ? (durationSec / 60) * 0.25 : 0)).toFixed(2))
    });

    // Injected flaw 4: 15 duplicate records
    if (i % 40 === 0 && records.length > 0) {
      records.push({ ...records[records.length - 1] }); // duplicate
    }
  }

  return records;
}

// Helper to generate realistic SaaS Sales
export function generateSaaSSales(): any[] {
  const companies = [
    'Acme Corp', 'StripeWorks', 'Vortex AI', 'CloudScale Inc', 'Apex Logistics',
    'Quantum Data', 'Horizon Health', 'Nexus Security', 'Omni Retail', 'HyperLink Labs',
    'Beacon Media', 'Zenith Financial', 'Echo Robotics', 'Solstice Energy', 'Alpha Bio'
  ];

  const industries = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education'];
  const tiers = ['Starter', 'Professional', 'Enterprise', 'Custom'];
  const countries = ['USA', 'United States', 'US', 'U.S.', 'United Kingdom', 'uk', 'GB', 'Germany', 'Canada', 'France'];
  const statuses = ['Active', 'active', 'ACTIVE', 'Churned', 'churned', 'Trial'];

  const records: any[] = [];
  const baseDate = new Date('2023-01-15T00:00:00Z');

  for (let i = 1; i <= 500; i++) {
    const company = `${companies[i % companies.length]} ${Math.floor(i / companies.length) + 1}`;
    const country = countries[i % countries.length];
    const tier = tiers[i % tiers.length];
    const status = statuses[i % statuses.length];

    // Injected flaw: null MRR on trial or freemium (28 records)
    let mrr: number | null = tier === 'Starter' ? 99 : tier === 'Professional' ? 499 : tier === 'Enterprise' ? 2499 : 5000;
    if (i % 18 === 0 || status === 'Trial') {
      mrr = null; // missing MRR
    }

    // Injected flaw: seats outlier (-1 or 9999)
    let seats = Math.floor(5 + (i % 50) * 4);
    if (i === 15) seats = -1;
    if (i === 210) seats = 99999;

    let nps: number | null = (i % 10) + 1;
    if (i % 25 === 0) nps = -999; // Corrupted NPS sentinel value

    const signupDate = new Date(baseDate.getTime() + i * 86400000 * 1.8).toISOString().split('T')[0];
    const churnDate = status.toLowerCase().includes('churn') 
      ? new Date(baseDate.getTime() + (i + 40) * 86400000 * 1.8).toISOString().split('T')[0] 
      : null;

    records.push({
      account_id: `ACC-${20000 + i}`,
      company_name: company,
      industry: industries[i % industries.length],
      country: country,
      plan_tier: tier,
      mrr_usd: mrr,
      signup_date: signupDate,
      status: status,
      churn_date: churnDate,
      seats: seats,
      nps_score: nps
    });

    // Injected duplicates
    if (i % 42 === 0) {
      records.push({ ...records[records.length - 1] });
    }
  }

  return records;
}

// Helper to generate Retail Orders
export function generateRetailOrders(): any[] {
  const categories = ['Technology', 'tech', 'Office Supplies', 'office supplies', 'Furniture'];
  const regions = ['East', 'West', 'Central', 'South'];
  const segments = ['Consumer', 'Corporate', 'Home Office'];
  const statuses = ['Delivered', 'delivered', 'DELIVERED', 'Pending', 'pending', 'Cancelled'];

  const products = [
    'Apple MacBook Pro 16', 'Logitech MX Master 3', 'Dell UltraSharp 27 Monitor',
    'Herman Miller Aeron Chair', 'Staples Heavy Duty Binder', 'Brother Laser Printer',
    'Ergonomic Standing Desk', 'Paper Mate Gel Pens (12pk)', 'Sony WH-1000XM5 Headphones'
  ];

  const records: any[] = [];
  const baseDate = new Date('2024-01-01T00:00:00Z');

  for (let i = 1; i <= 550; i++) {
    const category = categories[i % categories.length];
    const status = statuses[i % statuses.length];
    const quantity = (i % 8) + 1;
    const basePrice = 20 + ((i * 17) % 800);
    const sales = Number((basePrice * quantity).toFixed(2));
    
    // Injected flaw: null discount_pct on 45 records
    const discount = (i % 12 === 0) ? null : Number(((i % 5) * 0.05).toFixed(2));
    
    // Injected flaw: return with negative profit
    let profit = Number((sales * 0.28 - (discount ? sales * discount : 0)).toFixed(2));
    if (status.toLowerCase() === 'cancelled' || i % 19 === 0) {
      profit = -Number((sales * 0.15).toFixed(2));
    }

    const orderDate = new Date(baseDate.getTime() + i * 86400000 * 0.9).toISOString().split('T')[0];

    records.push({
      order_id: `ORD-${30000 + i}`,
      order_date: orderDate,
      customer_segment: segments[i % segments.length],
      region: regions[i % regions.length],
      category: category,
      sub_category: category.toLowerCase().includes('tech') ? 'Hardware' : 'Supplies',
      product_name: products[i % products.length],
      sales: sales,
      quantity: quantity,
      discount_pct: discount,
      profit: profit,
      order_status: status
    });
  }

  return records;
}

// Helper to generate Retail Shops & Consumer Revenue Growth Intelligence dataset
export function generateRetailGrowth(): any[] {
  const shopPrefixes = [
    'Apex', 'Metro', 'Beacon', 'Sunrise', 'Urban', 'Horizon', 'Zenith', 'Prime',
    'Summit', 'Crown', 'Golden', 'Vortex', 'Pinnacle', 'Velocity', 'Frontier', 'Nova'
  ];
  const shopTypes = [
    'Retail Outlet', 'Supermarket', 'Department Store', 'Corner Shop', 'Consumer Hub',
    'Boutique Goods', 'General Store', 'Merchant Plaza', 'Mart', 'Express Store'
  ];
  const segments = ['Retail Shop', 'retail shop', 'RETAIL', 'Direct Consumer', 'direct consumer', 'Wholesale Merchant'];
  const regions = ['East', 'West', 'North', 'South', 'Central'];
  const trajectories = ['Growing', 'growing', 'Declining', 'declining', 'DECLINING', 'Stagnant', 'At-Risk'];
  const declineReasons = [
    'Order Volume Dropped', 'Late Payments & Credit Holds', 'Competitor Price Undercutting',
    'Inventory Stockouts', 'Reduced Foot Traffic', 'Seasonal Margin Compression'
  ];

  const records: any[] = [];
  const baseDate = new Date('2024-01-01T00:00:00Z');

  for (let i = 1; i <= 650; i++) {
    const shopName = `${shopPrefixes[i % shopPrefixes.length]} ${shopTypes[(i * 3) % shopTypes.length]} #${Math.floor(i / 16) + 1}`;
    const segment = segments[i % segments.length];
    const region = regions[i % regions.length];
    const trajectory = trajectories[i % trajectories.length];
    const isDeclining = trajectory.toLowerCase().includes('declin') || trajectory.toLowerCase().includes('at-risk');
    const isGrowing = trajectory.toLowerCase().includes('grow');

    // Revenue calculations
    const prevRevenue = Math.floor(20000 + ((i * 347) % 120000));
    
    // Growth rate
    const growthRatePct = isGrowing 
      ? Number((8 + ((i * 13) % 45)).toFixed(1))
      : isDeclining
      ? -Number((6 + ((i * 17) % 52)).toFixed(1))
      : Number((((i % 7) - 3) * 1.5).toFixed(1));

    let actualRevenue = Math.floor(prevRevenue * (1 + (growthRatePct / 100)));
    let expectedRevenue: number | null = Math.floor(prevRevenue * 1.15); // expected 15% growth

    // Injected flaw: 32 accounts have null expected_revenue_ytd
    if (i % 20 === 0) {
      expectedRevenue = null;
    }

    // Injected flaw: 4 accounts with negative revenue from chargeback refunds
    if (i === 17 || i === 184) actualRevenue = -1500;
    if (i === 312 || i === 520) actualRevenue = -3200;

    // Health score (1 - 100)
    let healthScore = isGrowing ? Math.min(100, Math.floor(75 + (i % 25))) : isDeclining ? Math.floor(20 + (i % 35)) : Math.floor(50 + (i % 20));
    // Injected flaw: corrupted health score (-999)
    if (i === 42 || i === 299) healthScore = -999;

    // Attention priority
    let priority = 'Moderate';
    let churnRisk = 'Medium';
    if (isDeclining && (expectedRevenue === null || (expectedRevenue && actualRevenue < expectedRevenue * 0.75))) {
      priority = 'Immediate Action Needed';
      churnRisk = 'High';
    } else if (isDeclining) {
      priority = 'High Priority';
      churnRisk = 'High';
    } else if (isGrowing) {
      priority = 'Low Priority';
      churnRisk = 'Low';
    }

    // Primary decline reason
    let declineReason: string | null = null;
    if (isDeclining) {
      // Injected flaw: 40 declining accounts missing reason
      if (i % 7 !== 0) {
        declineReason = declineReasons[i % declineReasons.length];
      }
    }

    // Order metrics
    const orderCount = Math.max(1, Math.floor(12 + (actualRevenue > 0 ? actualRevenue / 1200 : 5)));
    const avgOrderVal = actualRevenue > 0 ? Number((actualRevenue / orderCount).toFixed(2)) : 0;

    // Injected flaw: mixed date formats
    const orderDateObj = new Date(baseDate.getTime() + (i * 86400000 * 0.8));
    const isSlash = i % 2 === 0;
    const lastOrderDate = isSlash
      ? `${(orderDateObj.getMonth() + 1).toString().padStart(2, '0')}/${orderDateObj.getDate().toString().padStart(2, '0')}/${orderDateObj.getFullYear()}`
      : orderDateObj.toISOString().split('T')[0];

    const revenueShortfall = expectedRevenue !== null ? expectedRevenue - actualRevenue : null;

    records.push({
      shop_id: `SHP-${10000 + i}`,
      shop_name: shopName,
      consumer_segment: segment,
      region: region,
      actual_revenue_ytd: actualRevenue,
      expected_revenue_ytd: expectedRevenue,
      previous_year_revenue: prevRevenue,
      revenue_shortfall_ytd: revenueShortfall,
      growth_rate_pct: growthRatePct,
      growth_trajectory: trajectory,
      customer_health_score: healthScore,
      attention_priority: priority,
      churn_risk_level: churnRisk,
      primary_decline_reason: declineReason,
      last_order_date: lastOrderDate,
      order_count_ytd: orderCount,
      avg_order_value: avgOrderVal
    });

    // Injected flaw: 14 duplicates
    if (i % 45 === 0 && records.length > 0) {
      records.push({ ...records[records.length - 1] });
    }
  }

  return records;
}

// In-memory dataset store
export const DATASET_STORE: Record<string, any[]> = {
  retail_growth: generateRetailGrowth(),
  bike_trips: generateBikeTrips(),
  saas_sales: generateSaaSSales(),
  retail_orders: generateRetailOrders()
};
