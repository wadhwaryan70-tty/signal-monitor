// What Arjun sells. Used as context for classification and for drafting outreach angles.

export const PRODUCT = {
  seller: "Arjun",
  name: "Arjun's workforce management platform",
  pitch:
    "A workforce management SaaS for Indian mid-market and enterprise companies with large frontline, shift-based or contract workforces.",
  capabilities: [
    "Shift scheduling and rostering across stores, hubs, warehouses, plants and hospitals",
    "Mobile, geo-fenced attendance and time tracking for deskless staff (works offline, regional languages)",
    "Leave, overtime and shift-swap management with manager approvals",
    "Labour-law compliance: Shops & Establishments Acts, working-hour and night-shift rules, contract labour records",
    "Contractor, temp and gig workforce onboarding and attendance alongside permanent staff",
    "Payroll-ready timesheets and workforce cost / overtime analytics for HR, ops and finance",
  ],
} as const;

export const SIGNAL_LABEL: Record<string, string> = {
  headcount_expansion: "Headcount expansion",
  leadership_hire: "New people/ops leader",
  digitalisation: "Workforce digitalisation",
  funding: "Funding round",
  operational_challenge: "Operational challenge",
  none: "No signal",
};

export const STAGE_LABEL = { outreach: "Outreach", pilot: "Live pilot", expansion: "Customer – expansion" } as const;
