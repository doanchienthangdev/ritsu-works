'use strict';
/** Shared toolkit registry (num · slug · title · domain). Single source for the
 *  19 reconstructable Domont toolkits (+ #0 master index, handled separately). */
const TOOLKITS = [
  { num: 1,  slug: 'business-strategy',                     title: 'Business Strategy & Strategic Planning',      domain: 'strategy' },
  { num: 2,  slug: 'operating-model-org-design',            title: 'Operating Model & Organization Design',       domain: 'organization' },
  { num: 3,  slug: 'digital-transformation-it-strategy',    title: 'Digital Transformation & IT Strategy',        domain: 'technology' },
  { num: 4,  slug: 'program-project-change-management',     title: 'Program, Project & Change Management',         domain: 'execution' },
  { num: 5,  slug: 'management-consulting',                 title: 'Management Consulting',                        domain: 'consulting' },
  { num: 6,  slug: 'hr-talent-management',                  title: 'HR & Talent Management',                       domain: 'people' },
  { num: 7,  slug: 'mergers-acquisitions',                  title: 'Mergers & Acquisitions',                       domain: 'corp-dev' },
  { num: 8,  slug: 'post-merger-integration',               title: 'Post Merger Integration',                      domain: 'corp-dev' },
  { num: 9,  slug: 'sales-marketing-pricing-communication', title: 'Sales, Marketing, Pricing & Communication',    domain: 'commercial' },
  { num: 10, slug: 'business-plan-entrepreneurship',        title: 'Business Plan & Entrepreneurship',             domain: 'strategy' },
  { num: 11, slug: 'supply-chain-strategy',                 title: 'Supply Chain Strategy',                        domain: 'operations' },
  { num: 12, slug: 'lean-six-sigma',                        title: 'Lean Six Sigma',                               domain: 'operations' },
  { num: 13, slug: 'risk-management',                       title: 'Risk Management',                              domain: 'governance' },
  { num: 14, slug: 'business-case',                         title: 'Business Case',                                domain: 'finance' },
  { num: 15, slug: 'executive-dashboard',                   title: 'Executive Dashboard',                          domain: 'metrics' },
  { num: 16, slug: 'leadership-development',                title: 'Leadership Development',                       domain: 'people' },
  { num: 17, slug: 'financial-modeling-planning-analysis',  title: 'Financial Modeling, Planning & Analysis',      domain: 'finance' },
  { num: 19, slug: 'data-analytics-ai-strategy',            title: 'Data Analytics & AI Strategy',                 domain: 'technology' },
  { num: 20, slug: 'personal-finance-buffett-investing',    title: 'Personal Finance & Warren Buffett Investing',  domain: 'finance' },
];
const bySlug = Object.fromEntries(TOOLKITS.map((t) => [t.slug, t]));
function pad(n) { return String(n).padStart(2, '0'); }
function bundleDir(base, tk) { return `${base}/${pad(tk.num)}-${tk.slug}`; }
module.exports = { TOOLKITS, bySlug, pad, bundleDir };
