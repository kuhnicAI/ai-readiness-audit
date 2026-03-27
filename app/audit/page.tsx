'use client'

import { useState, useCallback, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Screen {
  id: string
  heading: string
  subtext?: string
  type: 'intro' | 'tiles' | 'mode_select'
  options?: string[]
  note?: string
}

const SCREENS: Screen[] = [
  {
    id: 'mode_select',
    heading: "In the next 60 seconds we'll calculate exactly how much revenue your business is losing to missed calls.",
    subtext: "Not a score. Not a grade.\n\nA pound figure you can take to your next meeting.",
    type: 'mode_select' as 'intro',
  },
  {
    id: 'business_type',
    heading: 'What kind of business do you run?',
    type: 'tiles',
    options: [
      'Law firm',
      'Medical or dental practice',
      'Home services',
      'Real estate',
      'Hospitality or venue',
      'Other',
    ],
  },
  {
    id: 'weekly_inbound',
    heading: 'How many inbound calls does your business receive in a typical week?',
    type: 'tiles',
    options: ['Under 20 per week', '20 to 50 per week', '50 to 150 per week', '150 to 500 per week', 'Over 500 per week'],
  },
  {
    id: 'missed_rate',
    heading: 'What percentage of those calls go unanswered or to voicemail?',
    type: 'tiles',
    options: ['Almost none', 'Around 10 to 20 percent', 'Around a third', 'More than half', 'Not sure'],
  },
  {
    id: 'conversion_rate',
    heading: 'Roughly what percentage of your inbound calls actually turn into a new customer, booking, or paid job?',
    type: 'tiles',
    options: ['Under 10%', '10 to 25%', '25 to 50%', 'Over 50%', 'Not sure'],
  },
  {
    id: 'client_value',
    heading: 'What is a typical new customer, client, or booked job worth to your business?',
    type: 'tiles',
    options: ['Under £500', '£500 to £2,000', '£2,000 to £10,000', 'Over £10,000'],
  },
  {
    id: 'after_hours',
    heading: 'What happens when someone calls after hours or when all staff are busy?',
    type: 'tiles',
    options: [
      'We miss it entirely',
      'Someone calls back next day',
      'They leave a voicemail and we follow up',
      'We have an answering service but it is basic',
    ],
  },
  {
    id: 'urgency',
    heading: 'How urgent is this for you?',
    type: 'tiles',
    options: [
      'Actively looking for a solution',
      'On the radar for this year',
      'Just curious what the number is',
    ],
  },
]

function Tile({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-6 py-5 text-[17px] transition-all ${
        selected
          ? 'border-[#00D084] bg-[#00D084]/8 text-[#1a1a2e] font-medium ring-1 ring-[#00D084]/30'
          : 'border-[#e5e5e5] text-[#555] hover:border-[#ccc] hover:text-[#1a1a2e]'
      }`}
    >
      {label}
    </button>
  )
}

function AuditForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sdmName = searchParams.get('sdm') ?? undefined
  const sdmEmail = searchParams.get('sdm_email') ?? undefined

  // Restore from sessionStorage
  const savedForm = typeof window !== 'undefined' ? sessionStorage.getItem('audit_form') : null
  const restoredForm = savedForm ? JSON.parse(savedForm) : null

  const [step, setStep] = useState<number>(Math.min(restoredForm?.step ?? 0, SCREENS.length - 1))
  const [answers, setAnswers] = useState<Record<string, string>>(restoredForm?.answers ?? {})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [direction, setDirection] = useState(1)
  const [disqualified, setDisqualified] = useState(false)
  const [transitionLine, setTransitionLine] = useState('')

  // Persist to sessionStorage
  useEffect(() => {
    if (step > 0 || Object.keys(answers).length > 0) {
      sessionStorage.setItem('audit_form', JSON.stringify({ step, answers }))
    }
  }, [step, answers])

  const screen = SCREENS[step]
  const totalSteps = SCREENS.length
  const progress = ((step + 1) / totalSteps) * 100

  const setAnswer = useCallback((key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }, [])

  const [selectedMode, setSelectedMode] = useState<'form' | 'chat' | null>(null)

  const showProgressBar = !disqualified

  const canProceed = (() => {
    if (screen.type === 'mode_select') return !!selectedMode
    if (screen.type === 'intro') return true
    if (screen.type === 'tiles') return !!answers[screen.id]
    return false
  })()

  const navigatingRef = useRef(false)

  const TRANSITION_LINES: Record<string, Record<string, string>> = {
    weekly_inbound: {
      '20 to 50 per week': 'At that volume a single missed call carries real weight.',
      '50 to 150 per week': 'That is a meaningful volume. Even a small miss rate adds up fast.',
      '150 to 500 per week': 'At that volume missed calls are almost certainly a five figure annual problem.',
      'Over 500 per week': 'That kind of volume means missed calls are costing you serious money every week.',
    },
    client_value: {
      'Under £500': 'Volume is the driver here. Your miss rate will do the work.',
      '£500 to £2,000': 'At that value a handful of missed calls a week becomes a serious annual figure.',
      '£2,000 to £10,000': 'That changes the calculation significantly. Each missed call carries real weight.',
      'Over £10,000': 'At that value even one missed call per day is a six figure annual problem.',
    },
    urgency: {
      'Actively looking for a solution': 'Good. Your number is ready.',
      'On the radar for this year': 'Understood. Here is what the delay is costing you.',
      'Just curious what the number is': 'The number tends to change that.',
    },
  }

  const advanceStep = () => {
    if (step < totalSteps - 1) {
      navigatingRef.current = true
      setDirection(1)
      setStep(s => s + 1)
      setTimeout(() => { navigatingRef.current = false }, 400)
    }
  }

  const handleNext = () => {
    if (navigatingRef.current) return

    // After weekly_inbound is answered (screen index 2), disqualify if under 20
    if (step === 2 && screen.id === 'weekly_inbound' && answers.weekly_inbound === 'Under 20 per week') {
      fetch('/api/audit/disqualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_type: answers.business_type ?? null,
          weekly_inbound: answers.weekly_inbound,
          missed_rate: null,
        }),
      }).catch(() => {})
      setDisqualified(true)
      return
    }

    // Check for transition lines on specific questions
    const questionId = screen.id
    const answer = answers[questionId]
    const lines = TRANSITION_LINES[questionId]
    if (lines && answer && lines[answer]) {
      navigatingRef.current = true
      setTransitionLine(lines[answer])
      setTimeout(() => {
        setTransitionLine('')
        advanceStep()
      }, 2600)
      return
    }

    advanceStep()
  }

  const handleBack = () => {
    if (navigatingRef.current) return
    if (step > 0) {
      navigatingRef.current = true
      setDirection(-1)
      setStep(s => s - 1)
      setTimeout(() => { navigatingRef.current = false }, 400)
    }
  }

  const handleStartOver = () => {
    sessionStorage.removeItem('audit_form')
    setStep(0)
    setAnswers({})
    setDisqualified(false)
    setSelectedMode(null)
    setError('')
  }

  const [loadingMessage, setLoadingMessage] = useState('')

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    setLoadingMessage('Calculating your number')

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, sdm_name: sdmName, sdm_email: sdmEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit')
      sessionStorage.removeItem('audit_form')
      router.push(`/results/${data.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setSubmitting(false)
      setLoadingMessage('')
    }
  }

  const isLastStep = step === totalSteps - 1

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  }

  // ── Transition screen ──
  if (transitionLine) {
    return (
      <div className="min-h-screen bg-white text-[#1a1a2e] flex items-center justify-center overflow-hidden">
        <motion.div
          key={transitionLine}
          className="text-center max-w-xl mx-auto px-6"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="w-8 h-[2px] bg-[#00D084] mx-auto mb-6 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: 32 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          />
          <p className="text-[clamp(1.4rem,3.5vw,2rem)] font-serif text-[#888] leading-snug">
            {transitionLine}
          </p>
        </motion.div>
      </div>
    )
  }

  // ── Disqualification screen ──
  if (disqualified) {
    return (
      <div className="min-h-screen bg-white text-[#1a1a2e] flex items-center justify-center">
        <div className="max-w-[480px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-serif text-[#1a1a2e] leading-snug">
              A voice agent probably is not your biggest win right now.
            </h1>
            <p className="mt-6 text-[16px] text-[#888] leading-[1.7]">
              This calculator is built for businesses fielding a serious volume of inbound calls where missed or
              unanswered calls are costing real money. At your current call volume, the numbers will not stack up
              enough to justify it.
            </p>
            <p className="mt-4 text-[16px] text-[#888] leading-[1.7]">
              What you likely need is a simpler automation setup to handle the calls you do get more efficiently. We can help with that too.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <a
                href="https://kuhnic.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#00D084] px-8 py-4 text-[15px] font-semibold text-white hover:bg-[#00e090] transition-colors"
              >
                Visit Kuhnic.ai
              </a>
              <button
                onClick={handleStartOver}
                className="rounded-full border border-[#ddd] px-8 py-4 text-[15px] font-medium text-[#888] hover:border-[#bbb] hover:text-[#1a1a2e] transition-colors"
              >
                Start again
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#1a1a2e]">
      {/* Suspense loading overlay */}
      <AnimatePresence>
        {submitting && loadingMessage && (
          <motion.div
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-10 h-10 border-[3px] border-[#eee] border-t-[#00D084] rounded-full animate-spin mb-8" />
            <p className="text-[18px] text-[#999] font-serif">
              {loadingMessage}<span className="animate-pulse">...</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {showProgressBar && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-[#eee]">
          <div className="h-full bg-[#00D084] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 pt-16 pb-24 min-h-screen flex flex-col justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-serif text-[#1a1a2e] leading-snug">
              {screen.heading}
            </h1>
            {screen.subtext && (
              <div className="mt-4 text-[18px] text-[#888] space-y-4">
                {screen.subtext.split('\n\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}

            {(screen.type === 'mode_select' || screen.type === 'intro') && (
              <div className="mt-10">
                {screen.type === 'mode_select' && (
                  <div className="flex gap-4 mb-8">
                    {/* Form card */}
                    <button
                      onClick={() => setSelectedMode('form')}
                      className={`flex-1 rounded-xl border-2 p-6 text-left transition-all relative ${
                        selectedMode === 'form'
                          ? 'border-[#00D084] bg-[#00D084]/5'
                          : 'border-[#e5e5e5] hover:border-[#ccc]'
                      }`}
                    >
                      {selectedMode === 'form' && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#00D084] flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <svg className="w-8 h-8 text-[#00D084] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                      </svg>
                      <h3 className="text-[17px] font-bold text-[#1a1a2e]">I&rsquo;ll fill it in myself</h3>
                      <p className="text-[14px] text-[#999] mt-1">60 seconds. Go at your own pace.</p>
                    </button>
                    {/* Chat card */}
                    <button
                      onClick={() => setSelectedMode('chat')}
                      className={`flex-1 rounded-xl border-2 p-6 text-left transition-all relative ${
                        selectedMode === 'chat'
                          ? 'border-[#00D084] bg-[#00D084]/5'
                          : 'border-[#e5e5e5] hover:border-[#ccc]'
                      }`}
                    >
                      {selectedMode === 'chat' && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#00D084] flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <svg className="w-8 h-8 text-[#00D084] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                      <h3 className="text-[17px] font-bold text-[#1a1a2e]">Ask me the questions</h3>
                      <p className="text-[14px] text-[#999] mt-1">Our AI walks you through it. Same time, feels easier.</p>
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (screen.type === 'mode_select' && selectedMode === 'chat') {
                      router.push('/audit/chat')
                    } else {
                      handleNext()
                    }
                  }}
                  disabled={screen.type === 'mode_select' && !selectedMode}
                  className="rounded-full bg-[#00D084] px-8 py-4 text-[15px] font-semibold text-white hover:bg-[#00e090] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Let&rsquo;s go &nbsp;&rarr;
                </button>
              </div>
            )}

            {screen.type === 'tiles' && (
              <div className="mt-8 space-y-3">
                {screen.options?.map(opt => (
                  <Tile
                    key={opt}
                    label={opt}
                    selected={answers[screen.id] === opt}
                    onClick={() => setAnswer(screen.id, opt)}
                  />
                ))}
                {screen.note && (
                  <p className="mt-4 text-[13px] text-[#555]">{screen.note}</p>
                )}
              </div>
            )}

            {error && <p className="mt-4 text-[13px] text-red-500">{error}</p>}

            {screen.type !== 'intro' && screen.type !== 'mode_select' && <div className="mt-10 flex items-center justify-between">
              {step > 0 ? (
                <button onClick={handleBack} className="text-[14px] text-[#aaa] hover:text-[#1a1a2e] transition-colors">
                  &larr; Back
                </button>
              ) : <div />}

              {isLastStep ? (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed || submitting}
                  className="rounded-full bg-[#00D084] px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-[#00e090] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Calculating...' : 'Show Me My Number'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="rounded-full bg-[#00D084] px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-[#00e090] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue &nbsp;&rarr;
                </button>
              )}
            </div>}
          </motion.div>
        </AnimatePresence>

        {screen.type !== 'intro' && screen.type !== 'mode_select' && !isLastStep && <div className="mt-8 text-center">
          <span className="text-[12px] text-[#bbb]">{step} of {totalSteps - 1}</span>
        </div>}
      </div>
    </div>
  )
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]"><div className="text-[14px] text-[#666]">Loading...</div></div>}>
      <AuditForm />
    </Suspense>
  )
}
