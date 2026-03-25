import { AUDIT_STEPS, Category, CATEGORY_LABELS, FREE_TEXT_QUESTIONS, getScoreBand } from './questions'

export interface CategoryScore {
  category: Category
  label: string
  score: number      // 0-100 normalised
  rawScore: number
  maxScore: number
}

export interface AuditScores {
  overall: number
  band: string
  bandDescription: string
  categories: CategoryScore[]
}

export function calculateScores(answers: Record<string, string>): AuditScores {
  const rawScores: Record<Category, number> = {
    data: 0,
    infrastructure: 0,
    culture: 0,
    strategy: 0,
    maturity: 0,
  }

  const maxScores: Record<Category, number> = {
    data: 0,
    infrastructure: 0,
    culture: 0,
    strategy: 0,
    maturity: 0,
  }

  // Walk through all scored questions and tally up
  for (const step of AUDIT_STEPS) {
    for (const question of step.questions) {
      if (FREE_TEXT_QUESTIONS.has(question.id)) continue
      if (question.options.length === 0) continue

      // Find the max possible score for each category in this question
      const categoryMaxes: Partial<Record<Category, number>> = {}
      for (const opt of question.options) {
        for (const [cat, val] of Object.entries(opt.scores)) {
          const c = cat as Category
          if (val !== undefined) {
            categoryMaxes[c] = Math.max(categoryMaxes[c] ?? 0, val)
          }
        }
      }

      // Add max scores
      for (const [cat, maxVal] of Object.entries(categoryMaxes)) {
        maxScores[cat as Category] += maxVal
      }

      // Find selected option and add scores
      const answer = answers[question.id]
      if (!answer) continue

      const selectedOption = question.options.find(o => o.label === answer)
      if (!selectedOption) continue

      for (const [cat, val] of Object.entries(selectedOption.scores)) {
        if (val !== undefined) {
          rawScores[cat as Category] += val
        }
      }
    }
  }

  // Normalise each category to 0-100
  const categories: CategoryScore[] = (Object.keys(rawScores) as Category[]).map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    score: maxScores[cat] > 0 ? Math.round((rawScores[cat] / maxScores[cat]) * 100) : 0,
    rawScore: rawScores[cat],
    maxScore: maxScores[cat],
  }))

  // Overall = weighted average of all categories (equal weight)
  const overall = categories.length > 0
    ? Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length)
    : 0

  const band = getScoreBand(overall)

  return {
    overall,
    band: band.label,
    bandDescription: band.description,
    categories,
  }
}

export interface Recommendation {
  category: Category
  label: string
  level: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export function getRecommendations(categories: CategoryScore[]): Recommendation[] {
  return categories.map(cat => {
    const level = cat.score <= 33 ? 'low' : cat.score <= 66 ? 'medium' : 'high'
    return {
      category: cat.category,
      label: cat.label,
      level,
      recommendations: RECOMMENDATION_MAP[cat.category][level],
    }
  })
}

const RECOMMENDATION_MAP: Record<Category, Record<'low' | 'medium' | 'high', string[]>> = {
  data: {
    low: [
      'Start by auditing your existing data sources — identify where key business data lives and who owns it.',
      'Prioritise consolidating customer and financial data into a single system (e.g. CRM, ERP).',
      'Establish basic data quality processes: regular cleanups, consistent naming, and duplicate removal.',
    ],
    medium: [
      'Focus on connecting your existing systems to reduce manual data transfer between tools.',
      'Consider a lightweight data warehouse to centralise reporting across departments.',
      'Implement data validation rules at point of entry to improve quality over time.',
    ],
    high: [
      'Your data foundation is strong — focus on making it accessible for AI models and analytics.',
      'Explore real-time data pipelines to enable predictive AI use cases.',
      'Consider data enrichment from external sources to enhance your AI training data.',
    ],
  },
  infrastructure: {
    low: [
      'Begin migrating critical systems to cloud platforms for scalability and AI compatibility.',
      'Evaluate your current tools — many modern alternatives include built-in AI and automation features.',
      'Ensure you have APIs or integration points that would allow AI tools to connect to your systems.',
    ],
    medium: [
      'Identify integration gaps between your cloud tools — platforms like n8n or Zapier can bridge these quickly.',
      'Assess your current stack for AI-ready capabilities (many tools now offer built-in AI features).',
      'Consider standardising on platforms with strong API ecosystems for future AI integration.',
    ],
    high: [
      'Your infrastructure is AI-ready — focus on security and governance as you scale.',
      'Explore advanced integrations: custom AI agents, voice assistants, and intelligent automation.',
      'Consider building internal AI tools tailored to your specific workflows.',
    ],
  },
  culture: {
    low: [
      'Start with awareness — host an AI demo session to show your team what\'s possible in your industry.',
      'Identify 1-2 AI champions in your organisation who can lead adoption from within.',
      'Address fears head-on: AI augments human work, it doesn\'t replace it. Focus on removing tedious tasks.',
    ],
    medium: [
      'Formalise AI experimentation — give teams dedicated time to explore AI tools relevant to their work.',
      'Share success stories internally when AI saves time or improves outcomes.',
      'Invest in targeted AI training for team leads who can cascade knowledge.',
    ],
    high: [
      'Your culture is primed for AI — leverage this by scaling successful experiments across departments.',
      'Consider creating an internal AI centre of excellence or innovation team.',
      'Encourage team members to identify new AI use cases — the best ideas often come from the front line.',
    ],
  },
  strategy: {
    low: [
      'Start with a clear business case: identify your top 3 time-consuming processes and estimate the cost.',
      'AI doesn\'t require massive investment — pilot projects can start from as little as £5K with measurable ROI.',
      'Book a free consultation to understand what\'s realistic for your business and budget.',
    ],
    medium: [
      'Prioritise AI projects by ROI potential — start with the process that costs the most in manual time.',
      'Set clear success metrics before starting any AI project (time saved, error reduction, revenue impact).',
      'Consider a phased approach: proof of concept → pilot → full rollout, to manage risk and budget.',
    ],
    high: [
      'You have the strategic foundations — focus on execution speed and measuring outcomes.',
      'Consider a dedicated AI transformation roadmap with quarterly milestones.',
      'Explore AI opportunities beyond efficiency: new revenue streams, competitive moats, and customer experience.',
    ],
  },
  maturity: {
    low: [
      'Start with proven, low-risk AI applications: email automation, document processing, or chatbots.',
      'Leverage existing AI built into tools you already use (e.g. Microsoft Copilot, Google AI features).',
      'A guided proof of concept with an experienced partner can show results in under a week.',
    ],
    medium: [
      'Build on your existing automation with AI — add intelligence to workflows that are already automated.',
      'Explore AI for decision support: summarising data, flagging anomalies, and recommending actions.',
      'Document your AI wins and learnings to build the case for wider adoption.',
    ],
    high: [
      'You\'re ahead of most — focus on advanced use cases: predictive analytics, AI agents, and custom models.',
      'Consider how AI can create competitive advantages specific to your industry.',
      'Share your AI journey externally — it builds brand authority and attracts talent.',
    ],
  },
}
