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

const RECEPTIONIST_COST = 28000
const VOICE_AGENT_COST = 4500

export function calculateWaste(answers: Record<string, string | string[]>): WasteCalculation {
  const dailyCalls = DAILY_CALLS_MIDPOINTS[answers.daily_calls as string] ?? 20
  const missedRate = MISSED_RATE[answers.missed_rate as string] ?? 0.25
  const conversionRate = CONVERSION_RATE[answers.conversion_rate as string] ?? 0.15
  const clientValue = CLIENT_VALUE_MIDPOINTS[answers.client_value as string] ?? 1250
  const afterHoursMultiplier = AFTER_HOURS_MULTIPLIER[answers.after_hours as string] ?? 1.2
  const missedRateAssumed = (answers.missed_rate as string) === 'Not sure'
  const conversionRateAssumed = (answers.conversion_rate as string) === 'Not sure'

  const missedCallsPerDay = Math.round(dailyCalls * missedRate * 10) / 10
  const missedCallsAnnual = Math.round(missedCallsPerDay * 365)
  const lostConversionsAnnual = Math.round(missedCallsAnnual * conversionRate)
  const rawRevenue = lostConversionsAnnual * clientValue
  const revenueAtRisk = Math.round(rawRevenue * afterHoursMultiplier / 100) * 100

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
  }
}
