'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AUDIT_STEPS, FREE_TEXT_QUESTIONS } from '@/lib/questions'

function AuditForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sdmName = searchParams.get('sdm') ?? undefined
  const sdmEmail = searchParams.get('sdm_email') ?? undefined
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const currentStep = AUDIT_STEPS[step]
  const totalSteps = AUDIT_STEPS.length
  const progress = ((step + 1) / totalSteps) * 100

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }, [])

  const canProceed = currentStep.questions.every(q => {
    if (FREE_TEXT_QUESTIONS.has(q.id)) return !!answers[q.id]?.trim()
    if (q.options.length === 0) return true
    return !!answers[q.id]
  })

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(s => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, sdm_name: sdmName, sdm_email: sdmEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit')
      router.push(`/results/${data.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setSubmitting(false)
    }
  }

  const isLastStep = step === totalSteps - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fc] to-[#eef1f8]">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[#e5e7eb]">
        <div
          className="h-full bg-[#00263e] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header className="pt-8 pb-4 px-6 text-center">
        <div className="text-[13px] font-semibold tracking-widest uppercase text-[#00263e]/60">
          Transputec AI Readiness Audit
        </div>
        <div className="mt-2 text-[13px] text-[#6b7280]">
          Step {step + 1} of {totalSteps}
        </div>
      </header>

      {/* Card */}
      <main className="max-w-2xl mx-auto px-6 pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-[#e5e7eb] p-8 md:p-10">
          <h1 className="text-2xl font-bold text-[#00263e]">{currentStep.title}</h1>
          <p className="mt-1 text-[14px] text-[#6b7280]">{currentStep.description}</p>

          <div className="mt-8 space-y-8">
            {currentStep.questions.map(question => (
              <div key={question.id}>
                <label className="block text-[15px] font-semibold text-[#1a1a2e]">
                  {question.text}
                </label>
                {question.subtext && (
                  <p className="mt-0.5 text-[13px] text-[#9ca3af]">{question.subtext}</p>
                )}

                {FREE_TEXT_QUESTIONS.has(question.id) ? (
                  <input
                    type={question.id === 'contact_email' ? 'email' : 'text'}
                    value={answers[question.id] ?? ''}
                    onChange={e => setAnswer(question.id, e.target.value)}
                    placeholder={question.id === 'contact_email' ? 'you@company.com' : ''}
                    className="mt-3 w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-[14px] text-[#1a1a2e] placeholder-[#c4c9d4] focus:outline-none focus:ring-2 focus:ring-[#00263e]/20 focus:border-[#00263e] transition-colors"
                  />
                ) : (
                  <div className="mt-3 space-y-2">
                    {question.options.map(option => {
                      const selected = answers[question.id] === option.label
                      return (
                        <button
                          key={option.label}
                          onClick={() => setAnswer(question.id, option.label)}
                          className={`w-full text-left rounded-xl border px-4 py-3 text-[14px] transition-all ${
                            selected
                              ? 'border-[#00263e] bg-[#00263e]/5 text-[#00263e] font-medium ring-1 ring-[#00263e]/20'
                              : 'border-[#e5e7eb] text-[#3c4257] hover:border-[#c4c9d4] hover:bg-[#f9fafb]'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <p className="mt-4 text-[13px] text-red-600">{error}</p>
          )}

          {/* Navigation */}
          <div className="mt-10 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={handleBack}
                className="text-[14px] font-medium text-[#6b7280] hover:text-[#00263e] transition-colors"
              >
                &larr; Back
              </button>
            ) : (
              <div />
            )}

            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || submitting}
                className="rounded-xl bg-[#00263e] px-8 py-3 text-[14px] font-semibold text-white hover:bg-[#003a5c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Analysing...' : 'Get My Results'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="rounded-xl bg-[#00263e] px-8 py-3 text-[14px] font-semibold text-white hover:bg-[#003a5c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue &rarr;
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8f9fc] to-[#eef1f8]"><div className="text-[14px] text-[#6b7280]">Loading...</div></div>}>
      <AuditForm />
    </Suspense>
  )
}
