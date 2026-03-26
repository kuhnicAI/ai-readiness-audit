export interface WasteCalculation {
  missedRevenueAnnual: number
  receptionistCost: number
  voiceAgentCost: number
  estimatedSaving: number
  totalWaste: number
  monthlyWaste: number
  dailyCalls: number
  missedRate: number
  missedCallsPerDay: number
  missedCallsAnnual: number
  conversionRate: number
  clientValue: number
  missedRateAssumed: boolean
}

const DAILY_CALLS_MIDPOINTS: Record<string, number> = {
  'Under 10': 6,
  '10 to 30': 20,
  '30 to 80': 55,
  '80 to 200': 140,
  'Over 200': 300,
}

const MISSED_RATE: Record<string, number> = {
  'Almost none': 0.05,
  'Around 10 to 20 percent': 0.15,
  'Around a third': 0.33,
  'More than half': 0.55,
  'Not sure': 0.25,
}

const CLIENT_VALUE_MIDPOINTS: Record<string, number> = {
  'Under £500': 300,
  '£500 to £2,000': 1250,
  '£2,000 to £10,000': 6000,
  'Over £10,000': 25000,
}

const CONVERSION_RATE = 0.15
const RECEPTIONIST_COST = 28000
const VOICE_AGENT_COST_LOW = 3000
const VOICE_AGENT_COST_HIGH = 6000

export function calculateWaste(answers: Record<string, string | string[]>): WasteCalculation {
  const dailyCalls = DAILY_CALLS_MIDPOINTS[answers.daily_calls as string] ?? 20
  const missedRate = MISSED_RATE[answers.missed_rate as string] ?? 0.25
  const clientValue = CLIENT_VALUE_MIDPOINTS[answers.client_value as string] ?? 1250
  const missedRateAssumed = (answers.missed_rate as string) === 'Not sure'

  const missedCallsPerDay = Math.round(dailyCalls * missedRate * 10) / 10
  const missedCallsAnnual = Math.round(missedCallsPerDay * 365)
  const missedRevenueAnnual = Math.round(missedCallsAnnual * CONVERSION_RATE * clientValue / 100) * 100

  const voiceAgentCostMid = Math.round((VOICE_AGENT_COST_LOW + VOICE_AGENT_COST_HIGH) / 2)
  const estimatedSaving = missedRevenueAnnual + RECEPTIONIST_COST - voiceAgentCostMid

  return {
    missedRevenueAnnual,
    receptionistCost: RECEPTIONIST_COST,
    voiceAgentCost: voiceAgentCostMid,
    estimatedSaving,
    totalWaste: missedRevenueAnnual,
    monthlyWaste: Math.round(missedRevenueAnnual / 12 / 100) * 100,
    dailyCalls,
    missedRate,
    missedCallsPerDay,
    missedCallsAnnual,
    conversionRate: CONVERSION_RATE,
    clientValue,
    missedRateAssumed,
  }
}
