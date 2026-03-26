import Anthropic from '@anthropic-ai/sdk'
import type { WasteCalculation } from './waste'

const fmt = (n: number) => '£' + n.toLocaleString('en-GB')

interface ReportInput {
  answers: Record<string, string | string[]>
  waste: WasteCalculation
  companyName: string
  contactName: string
  role: string
  websiteContent?: string | null
}

export interface FullReport {
  executiveSummaryP1: string
  executiveSummaryP2: string
  executiveSummaryP3: string
  fix1Name: string
  fix1RightNow: string
  fix1AfterFix: string
  fix1Impact: string
  fix2Name: string
  fix2RightNow: string
  fix2AfterFix: string
  fix2Impact: string
  fix3Name: string
  fix3RightNow: string
  fix3AfterFix: string
  fix3Impact: string
  month1Milestones: string[]
  month2Milestones: string[]
  month3Milestones: string[]
}

export async function generateReport(input: ReportInput): Promise<string> {
  const { answers, waste, companyName, contactName, role, websiteContent } = input

  const prompt = `You are a senior AI automation consultant at Kuhnic, writing a personalised audit report for a business that just completed an inefficiency assessment. Your writing must read like a Big 4 consulting firm produced it. Specific, authoritative, and direct. Every sentence must earn its place.

BANNED WORDS AND PHRASES. Never use any of these under any circumstances:
haemorrhaging, hemorrhaging, streamline, leverage, pain points, game changer, game-changing, transformative, revolutionary, cutting-edge, state-of-the-art, innovative, seamlessly, seamless, robust, scalable, unlock, unleash, harness, empower, journey, ecosystem, synergy, holistic, actionable, deep dive, move the needle, at the end of the day, in today's fast-paced world, going forward, touch base, circle back, bandwidth, take this to the next level, best-in-class, world-class, bleeding edge, disruptive, future-proof, drill down, pivot, ideate, learnings, utilise, impactful, stakeholders, value-add, low-hanging fruit, boil the ocean, think outside the box, paradigm, mission-critical, unique

BANNED PUNCTUATION AND FORMATTING:
Never use em dashes. Never use ellipsis for stylistic effect. Never use exclamation marks. Never use bullet points except where explicitly instructed. Never use ALL CAPS in body text. Never use trademark symbols.

RULES FOR EVERY SECTION:
Every sentence must reference either a specific number from the data provided or a specific operational detail about this business. If you cannot make a sentence specific, cut it. Vague sentences are a failure.
Never write more than three sentences in a paragraph. After three sentences, start a new paragraph or stop.
Never repeat the same point in different words. Say it once, move on.
Never start two consecutive sentences with the same word.
Write in second person, addressing the company directly by name.
UK English throughout. Spellings: organisation not organization, recognised not recognized, colour not color, centre not center, analyse not analyze.

Here is what you know about this business:

Business type: ${answers.business_type ?? 'Not specified'}
Weekly inbound calls or enquiries: ${answers.weekly_inbound ?? 'Not specified'}
Estimated missed or unresolved rate: ${answers.missed_rate ?? 'Not specified'}
Average client value: ${answers.client_value ?? 'Not specified'}
Current follow-up process: ${answers.follow_up_process ?? 'Not specified'}
CRM status: ${answers.crm_status ?? 'Not specified'}
Weekly admin hours lost: ${answers.weekly_admin_hours ?? 'Not specified'}
People doing that admin work: ${answers.admin_headcount ?? 'Not specified'}
Average salary of those people: ${answers.salary_range ?? 'Not specified'}
Out of hours handling: ${answers.out_of_hours ?? 'Not specified'}
Reminder automation status: ${answers.reminders_status ?? 'Not specified'}
Urgency level: ${answers.urgency ?? 'Not specified'}
Company name / website: ${companyName}
Contact name: ${contactName}
Role: ${role}${websiteContent ? `

Website content (scraped from their site, use this to personalise language and reference what they actually do):
${websiteContent}` : ''}

Calculated figures:
Estimated annual revenue at risk from missed inbound: ${fmt(waste.revenueAtRisk)}
Estimated annual cost of manual admin: ${fmt(waste.adminCost)}
Total estimated annual waste: ${fmt(waste.totalWaste)}
Weekly inbound: ${waste.weeklyInbound}
Missed rate: ${Math.round(waste.missedRate * 100)}%
Conversion rate: ${Math.round(waste.conversionRate * 100)}%
Client value: ${fmt(waste.clientValue)}
Admin headcount: ${waste.adminHeadcount}
Admin hours/week: ${waste.weeklyAdminHours}
Hourly rate: £${waste.hourlyRate.toFixed(0)}

EXECUTIVE SUMMARY. Three paragraphs, strict rules:
Paragraph one (executiveSummaryP1): State the total waste figure, the company name, and the two categories it comes from. Maximum two sentences.
Paragraph two (executiveSummaryP2): Name the single largest waste category, the specific pound value, and one concrete operational reason it is happening based on their form answers. Maximum two sentences.
Paragraph three (executiveSummaryP3): State what implementing the top two fixes will achieve, with a specific pound figure and a 90 day timeframe. Maximum two sentences. Do not mention Kuhnic by name in this paragraph.

FIX DESCRIPTIONS. Hard limits:
Fix 1 should relate to inbound calls and missed revenue if missed rate is above 10% and client value above £500.
Fix 2 should relate to CRM and follow-up if out of date or non-existent. Otherwise use admin hours.
Fix 3 should relate to admin processes, out of hours handling, or reminders depending on worst answer.
Rank by financial impact, highest first.

Each rightNow value: exactly two sentences. Sentence one states the specific problem using at least one number from the submitted data. Sentence two gives one concrete operational consequence of that problem. No more. If you write a third sentence, you have failed.
Each afterFix value: exactly two sentences. Sentence one states the specific measurable outcome after implementation. Sentence two describes one concrete operational change for the team. No more. If you write a third sentence, you have failed.
Never let a fix impact figure exceed the total waste figure without explicitly stating it includes projected revenue uplift beyond the calculated waste.

ROADMAP MILESTONES. Hard limits:
Each milestone: maximum six words. Count them. Six words maximum. They must reference the actual business by name or by their specific process. Never write generic milestones that could apply to any company.

SANITY CHECKS. Apply these before generating any numbers:
If the calculated admin cost implies more than 20% of the stated headcount are doing nothing but admin full time, cap the admin hours used in the calculation at a realistic figure and note the assumption.
If any individual fix impact figure exceeds the total waste figure, recalculate it.
If the business type does not match the benchmark vertical, default to professional services benchmarks.

OUTPUT FORMAT:
Return a single valid JSON object. No markdown. No code fences. No preamble. No explanation. Just the raw JSON object starting with the opening curly brace.
The object must have exactly these keys and no others:
executiveSummaryP1, executiveSummaryP2, executiveSummaryP3, fix1Name, fix1RightNow, fix1AfterFix, fix1Impact, fix2Name, fix2RightNow, fix2AfterFix, fix2Impact, fix3Name, fix3RightNow, fix3AfterFix, fix3Impact, month1Milestones, month2Milestones, month3Milestones
The milestones values are arrays of strings, maximum four strings each, maximum six words per string. All other values are plain strings. No nested objects. No additional keys.`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.find(b => b.type === 'text')
  return textBlock?.text ?? '{}'
}

export function parseReport(raw: string): FullReport {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      executiveSummaryP1: parsed.executiveSummaryP1 ?? '',
      executiveSummaryP2: parsed.executiveSummaryP2 ?? '',
      executiveSummaryP3: parsed.executiveSummaryP3 ?? '',
      fix1Name: parsed.fix1Name ?? '',
      fix1RightNow: parsed.fix1RightNow ?? '',
      fix1AfterFix: parsed.fix1AfterFix ?? '',
      fix1Impact: parsed.fix1Impact ?? '',
      fix2Name: parsed.fix2Name ?? '',
      fix2RightNow: parsed.fix2RightNow ?? '',
      fix2AfterFix: parsed.fix2AfterFix ?? '',
      fix2Impact: parsed.fix2Impact ?? '',
      fix3Name: parsed.fix3Name ?? '',
      fix3RightNow: parsed.fix3RightNow ?? '',
      fix3AfterFix: parsed.fix3AfterFix ?? '',
      fix3Impact: parsed.fix3Impact ?? '',
      month1Milestones: Array.isArray(parsed.month1Milestones) ? parsed.month1Milestones : [],
      month2Milestones: Array.isArray(parsed.month2Milestones) ? parsed.month2Milestones : [],
      month3Milestones: Array.isArray(parsed.month3Milestones) ? parsed.month3Milestones : [],
    }
  } catch (err) {
    console.error('Failed to parse report JSON:', err, 'Raw:', cleaned.slice(0, 200))
    return {
      executiveSummaryP1: '', executiveSummaryP2: '', executiveSummaryP3: '',
      fix1Name: '', fix1RightNow: '', fix1AfterFix: '', fix1Impact: '',
      fix2Name: '', fix2RightNow: '', fix2AfterFix: '', fix2Impact: '',
      fix3Name: '', fix3RightNow: '', fix3AfterFix: '', fix3Impact: '',
      month1Milestones: [], month2Milestones: [], month3Milestones: [],
    }
  }
}
