import type { Category } from './questions'

export interface Finding {
  id: string
  category: Category
  title: string
  problem: string
  detail: string
  fix: string
  nextStep: string
  annualWaste: number
}

interface EmployeeTier {
  label: string
  avgEmployees: number
  avgSalary: number // annual, £
  hoursPerYear: number
}

const EMPLOYEE_TIERS: Record<string, EmployeeTier> = {
  '1–10': { label: '1–10', avgEmployees: 6, avgSalary: 35000, hoursPerYear: 1800 },
  '11–50': { label: '11–50', avgEmployees: 30, avgSalary: 38000, hoursPerYear: 1800 },
  '51–200': { label: '51–200', avgEmployees: 120, avgSalary: 42000, hoursPerYear: 1800 },
  '201–500': { label: '201–500', avgEmployees: 350, avgSalary: 45000, hoursPerYear: 1800 },
  '500+': { label: '500+', avgEmployees: 750, avgSalary: 48000, hoursPerYear: 1800 },
}

const SECTOR_LANGUAGE: Record<string, { processNoun: string; customerNoun: string; dataType: string }> = {
  'Professional Services': { processNoun: 'client engagements', customerNoun: 'clients', dataType: 'client records and billing data' },
  'Financial Services': { processNoun: 'transactions and compliance checks', customerNoun: 'customers', dataType: 'financial records and regulatory filings' },
  'Healthcare': { processNoun: 'patient workflows', customerNoun: 'patients', dataType: 'patient records and clinical data' },
  'Manufacturing': { processNoun: 'production workflows', customerNoun: 'customers', dataType: 'production data and supply chain records' },
  'Retail / E-commerce': { processNoun: 'order fulfilment and customer service', customerNoun: 'customers', dataType: 'inventory and sales data' },
  'Technology': { processNoun: 'development and deployment pipelines', customerNoun: 'users', dataType: 'product analytics and user data' },
  'Education': { processNoun: 'student administration', customerNoun: 'students', dataType: 'student records and course data' },
  'Real Estate / Property': { processNoun: 'property management workflows', customerNoun: 'tenants and landlords', dataType: 'property portfolios and lease agreements' },
  'Legal': { processNoun: 'case management', customerNoun: 'clients', dataType: 'case files and legal documents' },
  'Other': { processNoun: 'business processes', customerNoun: 'customers', dataType: 'business records' },
}

function getHourlyRate(tier: EmployeeTier): number {
  return tier.avgSalary / tier.hoursPerYear
}

export function calculateWasteAndFindings(answers: Record<string, string>): { totalWaste: number; findings: Finding[] } {
  const tier = EMPLOYEE_TIERS[answers.employee_count] ?? EMPLOYEE_TIERS['51–200']
  const sector = SECTOR_LANGUAGE[answers.industry] ?? SECTOR_LANGUAGE['Other']
  const hourlyRate = getHourlyRate(tier)
  const findings: Finding[] = []

  // ── Finding 1: Manual data entry / scattered data ──
  if (answers.data_centralisation === 'Scattered across spreadsheets and individual tools' ||
      answers.data_centralisation === 'Some systems connected, but lots of manual data entry') {
    const isScattered = answers.data_centralisation.includes('Scattered')
    const hoursPerPersonPerWeek = isScattered ? 6 : 3.5
    // Assume ~30% of employees affected
    const affectedStaff = Math.max(2, Math.round(tier.avgEmployees * 0.3))
    const annualHours = hoursPerPersonPerWeek * 48 * affectedStaff
    const waste = Math.round(annualHours * hourlyRate)

    findings.push({
      id: 'scattered_data',
      category: 'data',
      title: 'Manual data handling across disconnected systems',
      problem: `Your ${sector.dataType} is ${isScattered ? 'scattered across spreadsheets and individual tools' : 'partially connected but still requires significant manual data entry'}.`,
      detail: `An estimated ${affectedStaff} staff members are spending roughly ${hoursPerPersonPerWeek} hours per week on manual data transfer, duplicate entry, and reconciling information across systems. That's approximately ${annualHours.toLocaleString()} hours per year of skilled work going into data plumbing instead of value-adding activity.`,
      fix: 'Centralise your core data into connected systems with automated sync. This typically involves integrating your existing tools via APIs or middleware (like n8n or Make), establishing a single source of truth for key data, and eliminating manual copy-paste workflows.',
      nextStep: 'Map your top 5 data flows to identify which integrations would eliminate the most manual work.',
      annualWaste: waste,
    })
  }

  // ── Finding 2: No/low automation ──
  if (answers.existing_automation === 'Very little — most processes are manual' ||
      answers.existing_automation === 'Basic automation (e.g. email sequences, simple workflows)') {
    const isVeryLittle = answers.existing_automation.includes('Very little')
    const hoursPerPersonPerWeek = isVeryLittle ? 8 : 4
    const affectedStaff = Math.max(3, Math.round(tier.avgEmployees * 0.4))
    const annualHours = hoursPerPersonPerWeek * 48 * affectedStaff
    const waste = Math.round(annualHours * hourlyRate)

    findings.push({
      id: 'low_automation',
      category: 'maturity',
      title: `Repetitive ${sector.processNoun} running manually`,
      problem: `${isVeryLittle ? 'Most of your processes are still manual' : 'You have basic automation but the majority of workflows still require human intervention'}, creating a significant drag on productivity.`,
      detail: `Across your organisation, an estimated ${affectedStaff} people are spending ${hoursPerPersonPerWeek}+ hours per week on tasks that could be partially or fully automated — things like status updates, report generation, follow-up emails, data entry, and routine approvals. That's ${annualHours.toLocaleString()} hours annually.`,
      fix: 'Implement workflow automation for your highest-volume repetitive processes. Start with the tasks your team complains about most — they\'re usually the easiest wins. Modern automation tools can handle multi-step workflows across different systems without requiring code.',
      nextStep: 'List your team\'s top 10 most repetitive tasks and rank them by frequency × time per occurrence.',
      annualWaste: waste,
    })
  }

  // ── Finding 3: Manual customer handling ──
  if (answers.customer_interaction === 'Manually — phone and email only' ||
      answers.customer_interaction === 'Some ticketing or CRM, mostly manual responses') {
    const isFullyManual = answers.customer_interaction.includes('Manually')
    const weeklyEnquiries = Math.max(20, Math.round(tier.avgEmployees * (isFullyManual ? 8 : 5)))
    const minutesPerEnquiry = isFullyManual ? 15 : 10
    const annualHours = Math.round((weeklyEnquiries * minutesPerEnquiry * 48) / 60)
    const waste = Math.round(annualHours * hourlyRate)

    findings.push({
      id: 'manual_customer',
      category: 'infrastructure',
      title: `${sector.customerNoun.charAt(0).toUpperCase() + sector.customerNoun.slice(1)} enquiries handled without automation`,
      problem: `Your ${sector.customerNoun} enquiries are ${isFullyManual ? 'handled entirely via phone and email with no automation' : 'mostly manual despite having some ticketing'}, meaning every interaction requires a human regardless of complexity.`,
      detail: `With an estimated ${weeklyEnquiries.toLocaleString()} ${sector.customerNoun} interactions per week, and each one taking roughly ${minutesPerEnquiry} minutes of staff time, you're spending approximately ${annualHours.toLocaleString()} hours per year on enquiry handling. A significant portion of these — typically 40-60% — are routine questions that could be resolved automatically.`,
      fix: 'Deploy an AI-powered first line of response — a voice agent for phone enquiries or an intelligent chatbot for web/email. These handle routine questions instantly (24/7), only escalating complex cases to your team. Your staff focuses on high-value interactions instead of answering the same questions repeatedly.',
      nextStep: 'Categorise one week of enquiries by type. The most common categories are your automation candidates.',
      annualWaste: waste,
    })
  }

  // ── Finding 4: No AI tools in use ──
  if (answers.ai_tools_usage === 'No — we haven\'t explored AI yet' ||
      answers.ai_tools_usage === 'Individuals use AI informally (e.g. ChatGPT)') {
    const isNone = answers.ai_tools_usage.includes('No')
    const knowledgeWorkers = Math.max(3, Math.round(tier.avgEmployees * 0.5))
    const hoursPerWeekSaved = isNone ? 5 : 3 // potential hours saved if AI was adopted
    const annualHours = hoursPerWeekSaved * 48 * knowledgeWorkers
    const waste = Math.round(annualHours * hourlyRate)

    findings.push({
      id: 'no_ai_tools',
      category: 'maturity',
      title: 'Knowledge workers operating without AI assistance',
      problem: `${isNone ? 'AI tools haven\'t been explored' : 'AI usage is informal and unstructured'} across your organisation, meaning your team is doing everything the hard way — writing, research, analysis, summarisation, and planning without AI augmentation.`,
      detail: `Research shows AI-assisted knowledge workers are 30-50% more productive on core tasks. With approximately ${knowledgeWorkers} knowledge workers, you're missing out on an estimated ${annualHours.toLocaleString()} hours of productive capacity per year. That's not about replacing people — it's about giving them tools that handle the tedious parts so they can focus on judgment and creativity.`,
      fix: 'Roll out AI tools strategically: start with document drafting (proposals, reports, emails), then move to data analysis and summarisation. Create usage guidelines so adoption is structured, not ad-hoc. Pick 2-3 high-impact use cases and pilot them with a small team first.',
      nextStep: 'Identify 3 team members who spend the most time on writing, research, or analysis — they\'re your pilot group.',
      annualWaste: waste,
    })
  }

  // ── Finding 5: Decision-making without data ──
  if (answers.data_for_decisions === 'Mostly gut feeling and experience' ||
      answers.data_for_decisions === 'Some data, but it\'s hard to access or trust') {
    const isGutFeeling = answers.data_for_decisions.includes('gut feeling')
    // Opportunity cost: bad decisions + time gathering data manually
    const decisionMakersPercent = 0.15
    const decisionMakers = Math.max(2, Math.round(tier.avgEmployees * decisionMakersPercent))
    const hoursPerWeek = isGutFeeling ? 6 : 4
    const annualHours = hoursPerWeek * 48 * decisionMakers
    const waste = Math.round(annualHours * hourlyRate * 1.5) // 1.5x multiplier for opportunity cost

    findings.push({
      id: 'no_data_decisions',
      category: 'data',
      title: 'Business decisions made without reliable data',
      problem: `Key decisions in your organisation are driven by ${isGutFeeling ? 'gut feeling and experience rather than data' : 'partial data that\'s difficult to access or trust'}.`,
      detail: `Your ${decisionMakers} decision-makers are spending roughly ${hoursPerWeek} hours per week either gathering data manually, reconciling conflicting numbers, or simply making calls without the information they need. Beyond the direct time cost (${annualHours.toLocaleString()} hours/year), the hidden cost of suboptimal decisions — wrong hires, missed opportunities, late pivots — typically runs 2-3x higher.`,
      fix: 'Build automated dashboards that surface your key metrics in real-time. AI can consolidate data from multiple sources, flag anomalies, and even generate weekly briefings. The goal is that every decision-maker has the numbers they need without asking anyone or opening a spreadsheet.',
      nextStep: 'Identify the 5 metrics your leadership team asks about most frequently — those become your first dashboard.',
      annualWaste: waste,
    })
  }

  // ── Finding 6: Legacy/on-prem infrastructure ──
  if (answers.cloud_adoption === 'Mostly on-premise / legacy systems') {
    const infraStaff = Math.max(1, Math.round(tier.avgEmployees * 0.05))
    const maintenanceHoursPerWeek = infraStaff * 15
    const annualHours = maintenanceHoursPerWeek * 48
    const hardwareCost = tier.avgEmployees * 800 // rough annual per-employee on-prem overhead
    const waste = Math.round(annualHours * hourlyRate + hardwareCost)

    findings.push({
      id: 'legacy_infra',
      category: 'infrastructure',
      title: 'Legacy infrastructure blocking AI adoption',
      problem: 'Your systems are predominantly on-premise, which creates both a direct cost burden and a barrier to deploying modern AI and automation tools.',
      detail: `On-premise infrastructure requires dedicated maintenance time (estimated ${annualHours.toLocaleString()} hours/year for your ${infraStaff} IT staff), plus hardware refresh cycles, licensing, and the hidden cost of reduced agility. More importantly, most AI tools and modern automation platforms are cloud-native — meaning your current setup limits what you can deploy.`,
      fix: 'Develop a phased cloud migration strategy, starting with the systems that would benefit most from AI integration. This doesn\'t mean moving everything at once — a hybrid approach works well as a transitional step. Prioritise migrating data systems and customer-facing tools first.',
      nextStep: 'Audit your current infrastructure costs (hardware, licenses, maintenance time) against equivalent cloud pricing.',
      annualWaste: waste,
    })
  }

  // ── Finding 7: No strategy/budget for AI ──
  if (answers.ai_on_roadmap === 'No — it\'s not something we\'ve considered' &&
      answers.budget_allocated === 'No budget currently') {
    // Competitive disadvantage cost — harder to quantify, use conservative estimate
    const competitorAdvantage = Math.round(tier.avgSalary * tier.avgEmployees * 0.02) // 2% of total payroll

    findings.push({
      id: 'no_ai_strategy',
      category: 'strategy',
      title: 'No AI strategy while competitors accelerate',
      problem: 'AI is not on your roadmap and there\'s no budget allocated, which means you\'re not just standing still — you\'re falling behind as competitors in your sector adopt AI to reduce costs and improve service.',
      detail: `Across ${answers.industry ?? 'your sector'}, AI adoption is accelerating rapidly. Organisations that delay AI strategy by even 12-18 months typically find themselves at a measurable competitive disadvantage in cost efficiency, speed of service, and ability to attract talent. The cost of inaction compounds — it\'s not just about what you\'re spending now, it\'s about the gap widening each quarter.`,
      fix: 'You don\'t need a massive budget to start. Begin with a focused AI readiness workshop to identify your highest-ROI opportunities, then run a single proof-of-concept project (typically £5-15K) that demonstrates tangible results. Use those results to build the business case for broader investment.',
      nextStep: 'Book a free AI consultation to identify your top 3 quick-win opportunities with clear ROI projections.',
      annualWaste: competitorAdvantage,
    })
  }

  // ── Finding 8: Leadership scepticism ──
  if (answers.leadership_buyin === 'Sceptical or unaware') {
    const changeManagementCost = Math.round(tier.avgEmployees * 500) // conservative per-head cost of slow adoption

    findings.push({
      id: 'leadership_scepticism',
      category: 'culture',
      title: 'Leadership scepticism slowing transformation',
      problem: 'Your leadership team is sceptical or unaware of AI\'s potential, which creates a bottleneck for any transformation initiative — regardless of how strong the business case is.',
      detail: 'When leadership doesn\'t champion AI adoption, even the most motivated teams hit a ceiling. Budgets don\'t get approved, pilots don\'t get prioritised, and the organisation defaults to "the way we\'ve always done it." Meanwhile, the operational inefficiencies identified in this audit continue to compound.',
      fix: 'The most effective approach is a no-risk demonstration: a focused proof-of-concept on a real business problem that shows measurable results within 1-2 weeks. When leadership sees their own data being processed faster, their own costs being reduced, scepticism converts to advocacy quickly.',
      nextStep: 'Identify one pain point that leadership personally experiences (e.g., slow reporting, manual approvals) and propose a small pilot.',
      annualWaste: changeManagementCost,
    })
  }

  // ── Finding 9: Slow decision-making timeline ──
  if (answers.decision_timeline === 'Not sure — would need extensive internal discussions' ||
      answers.change_management === 'Resistant — change is slow and difficult') {
    const delayedSavings = findings.reduce((sum, f) => sum + f.annualWaste, 0)
    const monthlyDelayCost = Math.round(delayedSavings / 12)

    if (monthlyDelayCost > 1000) {
      findings.push({
        id: 'slow_decisions',
        category: 'culture',
        title: 'Organisational inertia costing you every month you delay',
        problem: 'Your organisation takes a long time to evaluate and adopt new solutions, which means the inefficiencies identified in this audit will persist for months or years before being addressed.',
        detail: `Based on the findings above, every month of delay costs your organisation approximately £${monthlyDelayCost.toLocaleString()}. Over a typical 6-12 month evaluation cycle, that\'s £${(monthlyDelayCost * 9).toLocaleString()} in continued waste. The irony is that most of these solutions can be deployed in 2-4 weeks.`,
        fix: 'Break the evaluation paralysis by starting small. A single proof-of-concept, scoped to one team and one process, carries minimal risk and provides the evidence needed to move faster on subsequent projects. You don\'t need to transform everything — just start with one thing.',
        nextStep: 'Pick your single highest-waste finding from this report and commit to a 2-week pilot.',
        annualWaste: monthlyDelayCost * 6, // 6 months of delay
      })
    }
  }

  const totalWaste = findings.reduce((sum, f) => sum + f.annualWaste, 0)

  return { totalWaste, findings }
}
