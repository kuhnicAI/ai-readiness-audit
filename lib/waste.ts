export interface WasteCalculation {
  revenueAtRisk: number
  adminCost: number
  totalWaste: number
  monthlyWaste: number
  annualHoursLost: number
  // Inputs used (for transparency)
  weeklyInbound: number
  missedRate: number
  conversionRate: number
  clientValue: number
  weeklyAdminHours: number
  adminHeadcount: number
  hourlyRate: number
  missedEnquiriesPerWeek: number
  // Assumption flags
  missedRateAssumed: boolean
  adminHoursAssumed: boolean
  salaryAssumed: boolean
  salaryUsed: string
}

const INBOUND_MIDPOINTS: Record<string, number> = {
  'Under 20': 12,
  '20 to 50': 35,
  '50 to 150': 100,
  '150 to 500': 325,
  'Over 500': 700,
}

const MISSED_RATE: Record<string, number> = {
  'Almost none': 0.05,
  'Around 10 to 20 percent': 0.15,
  'Around a third': 0.33,
  'More than half': 0.55,
  'Not sure': 0.20,
}

const CLIENT_VALUE_MIDPOINTS: Record<string, number> = {
  'Under £500': 300,
  '£500 to £2,000': 1250,
  '£2,000 to £10,000': 6000,
  '£10,000 to £50,000': 30000,
  'Over £50,000': 75000,
}

const ADMIN_HOURS_MIDPOINTS: Record<string, number> = {
  'Under 2 hours total': 1.5,
  '2 to 5 hours': 3.5,
  '5 to 15 hours': 10,
  'More than 15 hours': 20,
  'Not sure': 5,
}

const HEADCOUNT_MIDPOINTS: Record<string, number> = {
  'Just me': 1,
  '2 to 5 people': 3.5,
  '6 to 15 people': 10,
  '16 to 50 people': 30,
  'More than 50': 75,
}

const SALARY_HOURLY: Record<string, number> = {
  'Under £25,000': 12,
  '£25,000 to £40,000': 15.6,  // 32500 / 2080
  '£40,000 to £60,000': 24,    // 50000 / 2080
  '£60,000 to £90,000': 36,    // 75000 / 2080
  'Over £90,000': 52,           // 108000 / 2080
  "I'd rather not say": 18.3,  // 38000 / 2080
}

const CONVERSION_RATE = 0.15

export function calculateWaste(answers: Record<string, string | string[]>): WasteCalculation {
  const weeklyInbound = INBOUND_MIDPOINTS[answers.weekly_inbound as string] ?? 35
  const missedRate = MISSED_RATE[answers.missed_rate as string] ?? 0.20
  const clientValue = CLIENT_VALUE_MIDPOINTS[answers.client_value as string] ?? 1250
  const weeklyAdminHours = ADMIN_HOURS_MIDPOINTS[answers.weekly_admin_hours as string] ?? 5
  const adminHeadcount = HEADCOUNT_MIDPOINTS[answers.admin_headcount as string] ?? 3.5
  const hourlyRate = SALARY_HOURLY[answers.salary_range as string] ?? 18.3

  const missedRateAssumed = (answers.missed_rate as string) === 'Not sure'
  const adminHoursAssumed = (answers.weekly_admin_hours as string) === 'Not sure'
  const salaryAssumed = (answers.salary_range as string) === "I'd rather not say"

  const missedEnquiriesPerWeek = Math.round(weeklyInbound * missedRate * 10) / 10

  // Revenue at risk: missed enquiries × conversion rate × client value × 52 weeks
  const revenueAtRisk = Math.round((weeklyInbound * missedRate * CONVERSION_RATE * clientValue * 52) / 100) * 100

  // Admin cost: hours × headcount × hourly rate × 52 weeks
  const adminCost = Math.round((weeklyAdminHours * adminHeadcount * hourlyRate * 52) / 100) * 100

  const totalWaste = revenueAtRisk + adminCost
  const monthlyWaste = Math.round(totalWaste / 12 / 100) * 100
  const annualHoursLost = Math.round(weeklyAdminHours * adminHeadcount * 52)

  const salaryUsed = salaryAssumed
    ? '£38,000 (UK median for professional roles)'
    : (answers.salary_range as string)

  return {
    revenueAtRisk,
    adminCost,
    totalWaste,
    monthlyWaste,
    annualHoursLost,
    weeklyInbound,
    missedRate,
    conversionRate: CONVERSION_RATE,
    clientValue,
    weeklyAdminHours,
    adminHeadcount,
    hourlyRate,
    missedEnquiriesPerWeek,
    missedRateAssumed,
    adminHoursAssumed,
    salaryAssumed,
    salaryUsed,
  }
}
