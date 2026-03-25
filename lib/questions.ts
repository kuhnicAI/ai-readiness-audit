export type Category = 'data' | 'infrastructure' | 'culture' | 'strategy' | 'maturity'

export const CATEGORY_LABELS: Record<Category, string> = {
  data: 'Data Readiness',
  infrastructure: 'Tech Infrastructure',
  culture: 'Team & Culture',
  strategy: 'Strategic Alignment',
  maturity: 'Current AI Maturity',
}

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  data: 'How centralised, accessible, and clean your data is',
  infrastructure: 'Cloud adoption, integrations, and technical foundation',
  culture: 'Leadership buy-in, team literacy, and openness to change',
  strategy: 'Budget, roadmap, and decision-making readiness',
  maturity: 'Current AI and automation usage across the business',
}

export interface Option {
  label: string
  scores: Partial<Record<Category, number>>
}

export interface Question {
  id: string
  text: string
  subtext?: string
  options: Option[]
}

export interface AuditStep {
  title: string
  description: string
  questions: Question[]
}

export const AUDIT_STEPS: AuditStep[] = [
  // Step 1: Company Profile (no scoring — just data capture)
  {
    title: 'About Your Organisation',
    description: 'Help us tailor your report.',
    questions: [
      {
        id: 'company_name',
        text: 'What is your company name?',
        options: [], // free text
      },
      {
        id: 'contact_name',
        text: 'Your full name',
        options: [], // free text
      },
      {
        id: 'contact_email',
        text: 'Your work email',
        options: [], // free text
      },
      {
        id: 'role',
        text: 'Your role',
        options: [
          { label: 'C-Suite / Founder', scores: {} },
          { label: 'VP / Director', scores: {} },
          { label: 'Manager', scores: {} },
          { label: 'IT / Technical Lead', scores: {} },
          { label: 'Operations', scores: {} },
          { label: 'Other', scores: {} },
        ],
      },
      {
        id: 'industry',
        text: 'Your industry',
        options: [
          { label: 'Professional Services', scores: {} },
          { label: 'Financial Services', scores: {} },
          { label: 'Healthcare', scores: {} },
          { label: 'Manufacturing', scores: {} },
          { label: 'Retail / E-commerce', scores: {} },
          { label: 'Technology', scores: {} },
          { label: 'Education', scores: {} },
          { label: 'Real Estate / Property', scores: {} },
          { label: 'Legal', scores: {} },
          { label: 'Other', scores: {} },
        ],
      },
      {
        id: 'employee_count',
        text: 'Number of employees',
        options: [
          { label: '1–10', scores: {} },
          { label: '11–50', scores: {} },
          { label: '51–200', scores: {} },
          { label: '201–500', scores: {} },
          { label: '500+', scores: {} },
        ],
      },
    ],
  },

  // Step 2: Current Tech & Data
  {
    title: 'Technology & Data',
    description: 'Let\'s understand your current tech landscape.',
    questions: [
      {
        id: 'cloud_adoption',
        text: 'How would you describe your cloud adoption?',
        subtext: 'Think about where your main systems and data live.',
        options: [
          { label: 'Mostly on-premise / legacy systems', scores: { infrastructure: 1, data: 1 } },
          { label: 'Hybrid — some cloud, some on-premise', scores: { infrastructure: 2, data: 2 } },
          { label: 'Mostly cloud-based (e.g. Azure, AWS, Google)', scores: { infrastructure: 4, data: 3 } },
          { label: 'Fully cloud-native with modern architecture', scores: { infrastructure: 5, data: 4 } },
        ],
      },
      {
        id: 'data_centralisation',
        text: 'How centralised is your business data?',
        subtext: 'Customer records, financial data, operations — is it in one place?',
        options: [
          { label: 'Scattered across spreadsheets and individual tools', scores: { data: 1 } },
          { label: 'Some systems connected, but lots of manual data entry', scores: { data: 2 } },
          { label: 'Most data in connected systems with some gaps', scores: { data: 3 } },
          { label: 'Centralised data warehouse or well-integrated systems', scores: { data: 5 } },
        ],
      },
      {
        id: 'existing_automation',
        text: 'What level of automation do you currently have?',
        options: [
          { label: 'Very little — most processes are manual', scores: { maturity: 1, infrastructure: 1 } },
          { label: 'Basic automation (e.g. email sequences, simple workflows)', scores: { maturity: 2, infrastructure: 2 } },
          { label: 'Moderate — several automated workflows across departments', scores: { maturity: 3, infrastructure: 3 } },
          { label: 'Advanced — automation is core to our operations', scores: { maturity: 5, infrastructure: 4 } },
        ],
      },
    ],
  },

  // Step 3: AI Awareness & Usage
  {
    title: 'AI Awareness & Usage',
    description: 'How familiar is your team with AI?',
    questions: [
      {
        id: 'ai_tools_usage',
        text: 'Are any AI tools currently used in your organisation?',
        subtext: 'Think ChatGPT, Copilot, AI assistants, chatbots, etc.',
        options: [
          { label: 'No — we haven\'t explored AI yet', scores: { maturity: 0, culture: 1 } },
          { label: 'Individuals use AI informally (e.g. ChatGPT)', scores: { maturity: 2, culture: 2 } },
          { label: 'A few teams use AI tools for specific tasks', scores: { maturity: 3, culture: 3 } },
          { label: 'AI is integrated into multiple workflows', scores: { maturity: 5, culture: 4 } },
        ],
      },
      {
        id: 'team_familiarity',
        text: 'How would you rate your team\'s general AI literacy?',
        options: [
          { label: 'Low — most people don\'t understand what AI can do', scores: { culture: 1, maturity: 0 } },
          { label: 'Basic — people have heard of AI but don\'t use it', scores: { culture: 2, maturity: 1 } },
          { label: 'Moderate — some team members actively explore AI', scores: { culture: 3, maturity: 2 } },
          { label: 'High — the team regularly discusses and experiments with AI', scores: { culture: 5, maturity: 3 } },
        ],
      },
      {
        id: 'past_ai_projects',
        text: 'Have you attempted any AI or automation projects before?',
        options: [
          { label: 'No, never', scores: { maturity: 0 } },
          { label: 'We tried but it didn\'t work out', scores: { maturity: 1 } },
          { label: 'Yes, a small pilot or proof of concept', scores: { maturity: 3 } },
          { label: 'Yes, we\'ve deployed AI solutions in production', scores: { maturity: 5 } },
        ],
      },
    ],
  },

  // Step 4: Processes & Pain Points
  {
    title: 'Processes & Pain Points',
    description: 'Where are the biggest opportunities for AI?',
    questions: [
      {
        id: 'manual_processes',
        text: 'How much time does your team spend on repetitive, manual tasks?',
        subtext: 'Data entry, report generation, email follow-ups, scheduling, etc.',
        options: [
          { label: 'Very little — we\'re quite efficient', scores: { data: 3, maturity: 3 } },
          { label: 'Some — a few hours a week per person', scores: { data: 2, maturity: 2 } },
          { label: 'A lot — it\'s a major time sink', scores: { data: 1, maturity: 1 } },
          { label: 'It\'s our biggest productivity bottleneck', scores: { data: 0, maturity: 0 } },
        ],
      },
      {
        id: 'data_for_decisions',
        text: 'How do you currently make key business decisions?',
        options: [
          { label: 'Mostly gut feeling and experience', scores: { data: 1, strategy: 1 } },
          { label: 'Some data, but it\'s hard to access or trust', scores: { data: 2, strategy: 2 } },
          { label: 'Regular reporting and dashboards', scores: { data: 4, strategy: 3 } },
          { label: 'Data-driven with analytics and real-time insights', scores: { data: 5, strategy: 4 } },
        ],
      },
      {
        id: 'customer_interaction',
        text: 'How do you handle customer enquiries and support?',
        options: [
          { label: 'Manually — phone and email only', scores: { maturity: 1, infrastructure: 1 } },
          { label: 'Some ticketing or CRM, mostly manual responses', scores: { maturity: 2, infrastructure: 2 } },
          { label: 'CRM with templates and some automation', scores: { maturity: 3, infrastructure: 3 } },
          { label: 'Automated routing, chatbots, or AI-assisted responses', scores: { maturity: 5, infrastructure: 4 } },
        ],
      },
    ],
  },

  // Step 5: Strategy & Budget
  {
    title: 'Strategy & Budget',
    description: 'How does AI fit into your business plans?',
    questions: [
      {
        id: 'ai_on_roadmap',
        text: 'Is AI or automation on your business roadmap?',
        options: [
          { label: 'No — it\'s not something we\'ve considered', scores: { strategy: 0 } },
          { label: 'We\'re curious but haven\'t planned anything', scores: { strategy: 2 } },
          { label: 'It\'s on the roadmap for this year', scores: { strategy: 4 } },
          { label: 'It\'s a top priority — we\'re actively investing', scores: { strategy: 5 } },
        ],
      },
      {
        id: 'budget_allocated',
        text: 'Do you have budget allocated for AI or digital transformation?',
        options: [
          { label: 'No budget currently', scores: { strategy: 0 } },
          { label: 'We could find budget if the ROI is clear', scores: { strategy: 2 } },
          { label: 'Yes — we have a specific budget allocated', scores: { strategy: 4 } },
          { label: 'Significant investment already planned', scores: { strategy: 5 } },
        ],
      },
      {
        id: 'decision_timeline',
        text: 'If the right AI solution was presented, how quickly could you move?',
        options: [
          { label: 'Not sure — would need extensive internal discussions', scores: { strategy: 1, culture: 1 } },
          { label: '3–6 months to evaluate and decide', scores: { strategy: 2, culture: 2 } },
          { label: '1–3 months — we can move fairly quickly', scores: { strategy: 4, culture: 3 } },
          { label: 'Immediately — we\'re ready to start', scores: { strategy: 5, culture: 4 } },
        ],
      },
    ],
  },

  // Step 6: Culture & Readiness
  {
    title: 'Culture & Readiness',
    description: 'The human side of AI adoption.',
    questions: [
      {
        id: 'leadership_buyin',
        text: 'How does leadership feel about AI adoption?',
        options: [
          { label: 'Sceptical or unaware', scores: { culture: 0, strategy: 0 } },
          { label: 'Open to it but not driving it', scores: { culture: 2, strategy: 1 } },
          { label: 'Supportive and encouraging exploration', scores: { culture: 4, strategy: 3 } },
          { label: 'Championing it — it\'s a leadership priority', scores: { culture: 5, strategy: 4 } },
        ],
      },
      {
        id: 'change_management',
        text: 'How does your organisation handle change?',
        subtext: 'New tools, new processes, new ways of working.',
        options: [
          { label: 'Resistant — change is slow and difficult', scores: { culture: 1 } },
          { label: 'Cautious — we adopt change gradually', scores: { culture: 2 } },
          { label: 'Adaptive — we embrace change when it makes sense', scores: { culture: 4 } },
          { label: 'Agile — we thrive on innovation and rapid iteration', scores: { culture: 5 } },
        ],
      },
      {
        id: 'data_governance',
        text: 'Do you have data governance or security policies in place?',
        subtext: 'GDPR compliance, data handling policies, security protocols.',
        options: [
          { label: 'No formal policies', scores: { data: 1, infrastructure: 1 } },
          { label: 'Basic policies but not well enforced', scores: { data: 2, infrastructure: 2 } },
          { label: 'Solid policies in place and mostly followed', scores: { data: 4, infrastructure: 3 } },
          { label: 'Comprehensive governance with regular audits', scores: { data: 5, infrastructure: 4 } },
        ],
      },
    ],
  },
]

// Questions where options.length === 0 are free text inputs
export const FREE_TEXT_QUESTIONS = new Set(['company_name', 'contact_name', 'contact_email'])

export const SCORE_BANDS = [
  { min: 0, max: 25, label: 'AI Beginner', description: 'Your organisation is at the early stages of AI readiness. There are significant opportunities to build foundations in data, technology, and team capability that will position you for future AI success.' },
  { min: 26, max: 50, label: 'AI Curious', description: 'You have some building blocks in place but there are clear gaps to address. You\'re well-positioned to start with targeted pilot projects that can demonstrate quick wins and build momentum.' },
  { min: 51, max: 75, label: 'AI Ready', description: 'Your organisation has strong foundations for AI adoption. With the right implementation partner, you could see significant ROI from AI solutions within weeks, not months.' },
  { min: 76, max: 100, label: 'AI Advanced', description: 'You\'re ahead of the curve. Your organisation is primed for transformative AI implementations that can create significant competitive advantages and operational efficiencies.' },
] as const

export function getScoreBand(score: number): typeof SCORE_BANDS[number] {
  return SCORE_BANDS.find(b => score >= b.min && score <= b.max) ?? SCORE_BANDS[0]
}
