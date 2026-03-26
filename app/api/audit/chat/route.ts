import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are conducting a business efficiency audit on behalf of Kuhnic. Your job is to collect specific information from the user through natural conversation. Ask one question at a time. Be direct and intelligent. Never use filler phrases like "great", "thanks for sharing", "excellent", "awesome", "perfect", or any generic affirmation. Never use em dashes. Never ask a question you already have the answer to.

Before asking each new question (except the very first), write one short acknowledgement of what the user just said. Maximum one sentence. Make it specific to their answer. If they said they own a therapy practice, say something like "Therapy practices typically have a mix of inbound enquiry types, so this will be useful." If they gave a number, reflect it back briefly with context. The acknowledgement must add a small piece of context or signal that you understood the specific answer, not just that you received it. Then ask the next question on a new line with a blank line between the acknowledgement and the question.

You must collect ALL of these variables through conversation:
1. businessType - what kind of business they run
2. weeklyInbound - how many inbound calls/enquiries per week
3. missedRate - what percentage go unanswered or unresolved same day
4. clientValue - what a new customer is typically worth
5. followUpProcess - what happens to a missed call right now
6. crmStatus - do they use a CRM and is it kept up to date
7. weeklyAdminHours - hours per week team spends on manual tasks
8. adminHeadcount - how many people do this work
9. hourlySalary - rough average salary of those people
10. outOfHours - what happens when someone contacts them outside business hours
11. remindersStatus - do they send automated reminders before appointments
12. urgency - how urgent is fixing this

Ask naturally. Do not reveal that you are collecting specific variables. One question per message. Keep it conversational but professional.

When you have collected ALL 12 variables, your final message must be exactly:
AUDIT_COMPLETE
{"businessType":"...","weeklyInbound":"...","missedRate":"...","clientValue":"...","followUpProcess":"...","crmStatus":"...","weeklyAdminHours":"...","adminHeadcount":"...","hourlySalary":"...","outOfHours":"...","remindersStatus":"...","urgency":"..."}

The JSON values should match these option formats from the form:
- weeklyInbound: "Under 20", "20 to 50", "50 to 150", "150 to 500", "Over 500"
- missedRate: "Almost none", "Around 10 to 20 percent", "Around a third", "More than half", "Not sure"
- clientValue: "Under £500", "£500 to £2,000", "£2,000 to £10,000", "£10,000 to £50,000", "Over £50,000"
- weeklyAdminHours: "Under 2 hours total", "2 to 5 hours", "5 to 15 hours", "More than 15 hours", "Not sure"
- adminHeadcount: "Just me", "2 to 5 people", "6 to 15 people", "16 to 50 people", "More than 50"
- hourlySalary: "Under £25,000", "£25,000 to £40,000", "£40,000 to £60,000", "£60,000 to £90,000", "Over £90,000", "I'd rather not say"

Map the user's conversational answers to the closest matching option. For businessType, followUpProcess, crmStatus, outOfHours, remindersStatus, and urgency, use the exact form option text that best matches what they said.

Your opening message is: "Let's find your number. First, what does your business actually do?"

For each question, also output a line starting with OPTIONS: followed by a JSON array of suggested response tiles the user can click. For open-ended questions like business description, output OPTIONS: [] for a text input. Example:
OPTIONS: ["Under 20", "20 to 50", "50 to 150", "150 to 500", "Over 500"]`

export async function POST(req: NextRequest) {
  const { messages } = await req.json() as { messages: { role: string; content: string }[] }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  const text = response.content.find(b => b.type === 'text')?.text ?? ''

  // Parse OPTIONS line
  const optionsMatch = text.match(/OPTIONS:\s*(\[.*\])/)
  const options = optionsMatch ? JSON.parse(optionsMatch[1]) : []
  const messageText = text.replace(/OPTIONS:\s*\[.*\]\s*$/, '').trim()

  // Check for audit complete
  const isComplete = messageText.includes('AUDIT_COMPLETE')
  let collectedData = null
  if (isComplete) {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try { collectedData = JSON.parse(jsonMatch[0]) } catch {}
    }
  }

  return NextResponse.json({
    message: messageText.replace('AUDIT_COMPLETE', '').replace(/\{[\s\S]*\}/, '').trim() || "Last thing, where should we send your full report?",
    options,
    isComplete,
    collectedData,
  })
}
