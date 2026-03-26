export interface WasteCalculation {
  revenueAtRisk: number
  receptionistCost: number
  voiceAgentCost: number
  netOpportunity: number
  totalWaste: number
  monthlyWaste: number
  dailyCalls: number
  missedRate: number
  conversionRate: number
  clientValue: number
  missedCallsPerDay: number
  missedCallsAnnual: number
  lostConversionsAnnual: number
  afterHoursMultiplier: number
  missedRateAssumed: boolean
  conversionRateAssumed: boolean
  wasCapped: boolean
  capReason: string
}

const DAILY_CALLS_MIDPOINTS: Record<string, number> = {
  'Under 10': 7,
  '10 to 30': 20,
  '30 to 80': 55,
  '80 to 200': 140,
  'Over 200': 250,
}

const MISSED_RATE: Record<string, number> = {
  'Almost none': 0.05,
  'Around 10 to 20 percent': 0.15,
  'Around a third': 0.33,
  'More than half': 0.55,
  'Not sure': 0.25,
}

const CONVERSION_RATE: Record<string, number> = {
  'Under 10%': 0.07,
  '10 to 25%': 0.175,
  '25 to 50%': 0.375,
  'Over 50%': 0.6,
  'Not sure': 0.15,
}

const CLIENT_VALUE_MIDPOINTS: Record<string, number> = {
  'Under £500': 350,
  '£500 to £2,000': 1250,
  '£2,000 to £10,000': 6000,
  'Over £10,000': 15000,
}

const AFTER_HOURS_MULTIPLIER: Record<string, number> = {
  'We miss it entirely': 1.4,
  'Someone calls back next day': 1.2,
  'They leave a voicemail and we follow up': 1.1,
  'We have an answering service but it is basic': 1.15,
}

// Step 1: Company size caps
const SIZE_CAPS: Record<string, number> = {
  '1 to 10': 120000,
  '11 to 50': 400000,
  '51 to 200': 1200000,
  '201 to 500': 3500000,
  '500+': 8000000,
}

// Step 2: Business type caps
const TYPE_CAPS: Record<string, number> = {
  'Law firm': 2000000,
  'Medical or dental practice': 1500000,
  'Home services': 800000,
  'Real estate': 1800000,
  'Hospitality or venue': 600000,
  'Other': 1000000,
}

const RECEPTIONIST_COST = 28000
const VOICE_AGENT_COST = 4500

// Step 4: Input caps
const MAX_DAILY_CALLS = 500
const MAX_CLIENT_VALUE = 20000
const MAX_CONVERSION_RATE = 0.5
const MAX_MISSED_RATE = 0.6

export function calculateWaste(answers: Record<string, string | string[]>): WasteCalculation {
  // Raw values with input caps applied (Step 4)
  const dailyCalls = Math.min(DAILY_CALLS_MIDPOINTS[answers.daily_calls as string] ?? 20, MAX_DAILY_CALLS)
  const missedRate = Math.min(MISSED_RATE[answers.missed_rate as string] ?? 0.25, MAX_MISSED_RATE)
  const conversionRate = Math.min(CONVERSION_RATE[answers.conversion_rate as string] ?? 0.15, MAX_CONVERSION_RATE)
  const clientValue = Math.min(CLIENT_VALUE_MIDPOINTS[answers.client_value as string] ?? 1250, MAX_CLIENT_VALUE)
  const afterHoursMultiplier = AFTER_HOURS_MULTIPLIER[answers.after_hours as string] ?? 1.2
  const missedRateAssumed = (answers.missed_rate as string) === 'Not sure'
  const conversionRateAssumed = (answers.conversion_rate as string) === 'Not sure'

  const missedCallsPerDay = Math.round(dailyCalls * missedRate * 10) / 10
  const missedCallsAnnual = Math.round(missedCallsPerDay * 365)
  const lostConversionsAnnual = Math.round(missedCallsAnnual * conversionRate)
  const rawRevenue = lostConversionsAnnual * clientValue
  let revenueAtRisk = Math.round(rawRevenue * afterHoursMultiplier / 100) * 100

  // Step 1 + 2 + 3: Apply caps
  const sizeCap = SIZE_CAPS[answers.employee_count as string] ?? 8000000
  const typeCap = TYPE_CAPS[answers.business_type as string] ?? 1000000
  const effectiveCap = Math.min(sizeCap, typeCap)

  let wasCapped = false
  let capReason = ''

  if (revenueAtRisk > effectiveCap) {
    revenueAtRisk = effectiveCap
    wasCapped = true
    const businessType = (answers.business_type as string) ?? 'this type of'
    capReason = `Adjusted to reflect conservative upper bound for ${businessType} businesses of this size.`
  }

  const netOpportunity = revenueAtRisk + RECEPTIONIST_COST - VOICE_AGENT_COST

  return {
    revenueAtRisk,
    receptionistCost: RECEPTIONIST_COST,
    voiceAgentCost: VOICE_AGENT_COST,
    netOpportunity,
    totalWaste: revenueAtRisk,
    monthlyWaste: Math.round(revenueAtRisk / 12 / 100) * 100,
    dailyCalls,
    missedRate,
    conversionRate,
    clientValue,
    missedCallsPerDay,
    missedCallsAnnual,
    lostConversionsAnnual,
    afterHoursMultiplier,
    missedRateAssumed,
    conversionRateAssumed,
    wasCapped,
    capReason,
  }
}
