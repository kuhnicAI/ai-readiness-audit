export interface WasteCalculation {
  revenueAtRisk: number
  receptionistCost: number
  voiceAgentCost: number
  netOpportunity: number
  showNetOpportunity: boolean
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
  afterHoursLabel: string
  baseRevenueAtRisk: number
  missedRateAssumed: boolean
  conversionRateAssumed: boolean
  wasCapped: boolean
  capReason: string
  consistencyError: boolean
  weeklyMidpoint: number
  methodology: MethodologyBreakdown
}

export interface MethodologyBreakdown {
  dailyCallsReceived: number
  missedPercent: number
  missedCallsPerDay: number
  annualMissedCalls: number
  conversionPercent: number
  lostClientsPerYear: number
  avgClientValue: number
  baseRevenueAtRisk: number
  afterHoursMultiplier: number
  adjustedRevenueAtRisk: number
  capApplied: boolean
  capBusinessType: string
}

export interface ValidationError {
  type: 'redirect'
  questionIndex: number
  message: string
}

// Step 2 — Weekly to daily midpoints
const WEEKLY_MIDPOINTS: Record<string, { weekly: number; daily: number }> = {
  'Under 20 per week':    { weekly: 14,  daily: 2 },
  '20 to 50 per week':    { weekly: 35,  daily: 5 },
  '50 to 150 per week':   { weekly: 100, daily: 14 },
  '150 to 500 per week':  { weekly: 325, daily: 46 },
  'Over 500 per week':    { weekly: 600, daily: 86 },
}

// Step 3 — Missed rate decimals
const MISSED_RATE: Record<string, number> = {
  'Almost none': 0.05,
  'Around 10 to 20 percent': 0.15,
  'Around a third': 0.33,
  'More than half': 0.55,
  'Not sure': 0.20,
}

// Step 4 — Conversion rate decimals
const CONVERSION_RATE: Record<string, number> = {
  'Under 10%': 0.08,
  '10 to 25%': 0.17,
  '25 to 50%': 0.35,
  'Over 50%': 0.50,
  'Not sure': 0.15,
}

// Step 5 — Client value midpoints
const CLIENT_VALUE_MIDPOINTS: Record<string, number> = {
  'Under £500': 300,
  '£500 to £2,000': 1000,
  '£2,000 to £10,000': 5000,
  'Over £10,000': 15000,
}

// Step 6 — After hours multiplier
const AFTER_HOURS_MULTIPLIER: Record<string, number> = {
  'We miss it entirely': 1.35,
  'Someone calls back next day': 1.15,
  'They leave a voicemail and we follow up': 1.10,
  'We have an answering service but it is basic': 1.12,
}
const DEFAULT_AFTER_HOURS_MULTIPLIER = 1.20

// Step 7 — Cap 2: Business type ceiling
const TYPE_CAPS: Record<string, number> = {
  'Law firm': 2000000,
  'Medical or dental practice': 1500000,
  'Home services': 800000,
  'Real estate': 1800000,
  'Hospitality or venue': 600000,
  'Other': 1000000,
}

// Step 7 — Cap 3: Company size ceiling
const SIZE_CAPS: Record<string, number> = {
  '1 to 10': 150000,
  '11 to 50': 500000,
  '51 to 200': 1500000,
  '201 to 500': 4000000,
  '500+': 8000000,
}

const RECEPTIONIST_COST = 28000
const VOICE_AGENT_COST = 4500

/**
 * Step 1 — Validate inputs before calculating.
 * Returns a ValidationError if a required field is missing, otherwise null.
 */
export function validateWasteInputs(answers: Record<string, string | string[]>): ValidationError | null {
  const weeklyInbound = answers.weekly_inbound as string | undefined
  if (!weeklyInbound || !WEEKLY_MIDPOINTS[weeklyInbound]) {
    return {
      type: 'redirect',
      questionIndex: 2, // question 2 in the form (0-indexed screen)
      message: 'We need your call volume to calculate your number. Please answer this question.',
    }
  }

  const clientValue = answers.client_value as string | undefined
  if (!clientValue || !CLIENT_VALUE_MIDPOINTS[clientValue]) {
    return {
      type: 'redirect',
      questionIndex: 5, // question 5 in the form
      message: 'We need your average client value to calculate your number. Please answer this question.',
    }
  }

  return null
}

export function calculateWaste(answers: Record<string, string | string[]>): WasteCalculation {
  // ── Step 2: Convert weekly to daily ──
  const weeklyEntry = WEEKLY_MIDPOINTS[answers.weekly_inbound as string]
  const weeklyMidpoint = weeklyEntry?.weekly ?? 35
  const dailyCalls = weeklyEntry?.daily ?? 5

  // ── Step 3: Apply missed rate ──
  const missedRateRaw = answers.missed_rate as string | undefined
  const missedRateAssumed = !missedRateRaw || missedRateRaw === 'Not sure' || !(missedRateRaw in MISSED_RATE)
  const missedRate = missedRateAssumed && missedRateRaw !== 'Not sure'
    ? 0.20
    : MISSED_RATE[missedRateRaw as string] ?? 0.20

  const missedCallsPerDay = dailyCalls * missedRate
  const missedCallsAnnual = Math.round(missedCallsPerDay * 365)

  // ── Step 4: Apply conversion rate ──
  const conversionRateRaw = answers.conversion_rate as string | undefined
  const conversionRateAssumed = !conversionRateRaw || conversionRateRaw === 'Not sure' || !(conversionRateRaw in CONVERSION_RATE)
  const conversionRate = conversionRateAssumed && conversionRateRaw !== 'Not sure'
    ? 0.15
    : CONVERSION_RATE[conversionRateRaw as string] ?? 0.15

  const lostConversionsAnnual = Math.round(missedCallsAnnual * conversionRate)

  // ── Step 5: Apply client value ──
  const clientValue = CLIENT_VALUE_MIDPOINTS[answers.client_value as string] ?? 1000
  const baseRevenueAtRisk = lostConversionsAnnual * clientValue

  // ── Step 6: Apply after hours multiplier ──
  const afterHoursRaw = answers.after_hours as string | undefined
  const afterHoursMultiplier = afterHoursRaw && afterHoursRaw in AFTER_HOURS_MULTIPLIER
    ? AFTER_HOURS_MULTIPLIER[afterHoursRaw]
    : DEFAULT_AFTER_HOURS_MULTIPLIER
  const afterHoursLabel = afterHoursRaw && afterHoursRaw in AFTER_HOURS_MULTIPLIER
    ? afterHoursRaw
    : 'Not answered (default)'

  let adjustedRevenueAtRisk = baseRevenueAtRisk * afterHoursMultiplier

  // ── Step 7: Sanity caps in order ──
  let wasCapped = false
  let capReason = ''

  // Cap 1 — Missed rate reality check
  if (missedRate <= 0.05 && adjustedRevenueAtRisk > 50000) {
    // Recalculate without the after hours multiplier
    adjustedRevenueAtRisk = baseRevenueAtRisk
  }

  // Cap 2 & 3 — Business type and company size ceilings
  const typeCap = TYPE_CAPS[answers.business_type as string] ?? 1000000
  const sizeCap = SIZE_CAPS[answers.employee_count as string] ?? 8000000
  const effectiveCap = Math.min(typeCap, sizeCap)

  if (adjustedRevenueAtRisk > effectiveCap) {
    adjustedRevenueAtRisk = effectiveCap
    wasCapped = true
    const businessType = (answers.business_type as string) ?? 'this type of'
    capReason = `Figure adjusted to reflect conservative upper bound for ${businessType} businesses.`
  }

  // ── Step 8: Round to nearest £100 ──
  adjustedRevenueAtRisk = Math.round(adjustedRevenueAtRisk / 100) * 100

  // ── Step 8: Calculate display metrics ──
  const netOpportunity = adjustedRevenueAtRisk + RECEPTIONIST_COST - VOICE_AGENT_COST
  const showNetOpportunity = adjustedRevenueAtRisk >= 10000

  // ── Step 10: Internal consistency check ──
  let consistencyError = false
  if (adjustedRevenueAtRisk <= 0 || (showNetOpportunity && netOpportunity <= adjustedRevenueAtRisk)) {
    // netOpportunity should always be > adjustedRevenueAtRisk because we add 28k and subtract 4.5k
    // This would only fail if adjustedRevenueAtRisk is 0 or negative
    if (adjustedRevenueAtRisk <= 0) {
      consistencyError = true
    }
  }

  // ── Step 9: Build methodology breakdown ──
  const methodology: MethodologyBreakdown = {
    dailyCallsReceived: dailyCalls,
    missedPercent: Math.round(missedRate * 100),
    missedCallsPerDay: Math.round(missedCallsPerDay * 10) / 10,
    annualMissedCalls: missedCallsAnnual,
    conversionPercent: Math.round(conversionRate * 100),
    lostClientsPerYear: lostConversionsAnnual,
    avgClientValue: clientValue,
    baseRevenueAtRisk: Math.round(baseRevenueAtRisk),
    afterHoursMultiplier,
    adjustedRevenueAtRisk,
    capApplied: wasCapped,
    capBusinessType: (answers.business_type as string) ?? '',
  }

  return {
    revenueAtRisk: adjustedRevenueAtRisk,
    receptionistCost: RECEPTIONIST_COST,
    voiceAgentCost: VOICE_AGENT_COST,
    netOpportunity,
    showNetOpportunity,
    totalWaste: adjustedRevenueAtRisk,
    monthlyWaste: Math.round(adjustedRevenueAtRisk / 12 / 100) * 100,
    dailyCalls,
    missedRate,
    conversionRate,
    clientValue,
    missedCallsPerDay: Math.round(missedCallsPerDay * 10) / 10,
    missedCallsAnnual: missedCallsAnnual,
    lostConversionsAnnual,
    afterHoursMultiplier,
    afterHoursLabel,
    baseRevenueAtRisk: Math.round(baseRevenueAtRisk),
    missedRateAssumed,
    conversionRateAssumed,
    wasCapped,
    capReason,
    consistencyError,
    weeklyMidpoint,
    methodology,
  }
}
