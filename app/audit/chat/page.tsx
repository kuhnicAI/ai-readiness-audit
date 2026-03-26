'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const TOTAL_VARIABLES = 12

function useStreamText(text: string, speed = 8) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(interval); setDone(true) }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return { displayed, done }
}

function StreamingMessage({ content, onDone }: { content: string; onDone: () => void }) {
  const { displayed, done } = useStreamText(content)
  const doneRef = useRef(false)
  useEffect(() => { if (done && !doneRef.current) { doneRef.current = true; onDone() } }, [done, onDone])
  return <>{displayed}<span className={done ? 'hidden' : 'inline-block w-[2px] h-[18px] bg-[#111] ml-0.5 animate-pulse'} /></>
}

function ChatAudit() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sdmName = searchParams.get('sdm') ?? undefined
  const sdmEmail = searchParams.get('sdm_email') ?? undefined

  const [messages, setMessages] = useState<Message[]>([])
  const [inlineOptions, setInlineOptions] = useState<string[]>([])
  const [showInlineOptions, setShowInlineOptions] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [isTextQuestion, setIsTextQuestion] = useState(false)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [collected, setCollected] = useState<Record<string, string> | null>(null)
  const [contactForm, setContactForm] = useState({ contact_name: '', contact_email: '', company_name: '' })
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  const sendToApi = useCallback(async (newMessages: Message[]) => {
    setLoading(true)
    setShowInlineOptions(false)
    setInlineOptions([])
    setIsTextQuestion(false)

    await new Promise(r => setTimeout(r, 300 + Math.random() * 200))

    try {
      const res = await fetch('/api/audit/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      setLoading(false)

      // Store options for after streaming
      const opts = data.options ?? []
      setInlineOptions(opts)
      setIsTextQuestion(opts.length === 0 && !data.isComplete)
      setStreaming(true)

      const assistantMsg: Message = { role: 'assistant', content: data.message }
      setMessages(prev => [...prev, assistantMsg])

      const answeredCount = newMessages.filter(m => m.role === 'user').length
      setProgress(Math.min((answeredCount / TOTAL_VARIABLES) * 100, 95))

      if (data.isComplete && data.collectedData) {
        setCollected(data.collectedData)
        setProgress(100)
      }
    } catch {
      setLoading(false)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
      setStreaming(false)
    }
    scrollToBottom()
  }, [scrollToBottom])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    // Show first message instantly without API call
    const firstMsg: Message = { role: 'assistant', content: "Let's find your number. First, what does your business actually do?" }
    setMessages([firstMsg])
    setInlineOptions([])
    setIsTextQuestion(true)
    setStreaming(true)
    // Trigger streaming animation on the hardcoded message
    setTimeout(() => scrollToBottom(), 50)
  }, [scrollToBottom])

  const handleStreamDone = useCallback(() => {
    setStreaming(false)
    setShowInlineOptions(true)
    scrollToBottom()
  }, [scrollToBottom])

  const handleSendTile = useCallback((text: string) => {
    const userMsg: Message = { role: 'user', content: text }
    setShowInlineOptions(false)
    setInlineOptions([])
    const updated = [...messages, userMsg]
    setMessages(updated)
    scrollToBottom()
    sendToApi(updated)
  }, [messages, scrollToBottom, sendToApi])

  const handleSendText = useCallback(() => {
    if (!textInput.trim()) return
    handleSendTile(textInput.trim())
    setTextInput('')
  }, [textInput, handleSendTile])

  const handleSubmitContact = async () => {
    if (!contactForm.contact_name.trim() || !contactForm.contact_email.trim() || !contactForm.company_name.trim()) return
    if (!collected) return
    setSubmitting(true)
    const answers: Record<string, string> = {
      business_type: collected.businessType ?? '',
      weekly_inbound: collected.weeklyInbound ?? '',
      missed_rate: collected.missedRate ?? '',
      client_value: collected.clientValue ?? '',
      follow_up_process: collected.followUpProcess ?? '',
      crm_status: collected.crmStatus ?? '',
      weekly_admin_hours: collected.weeklyAdminHours ?? '',
      admin_headcount: collected.adminHeadcount ?? '',
      salary_range: collected.hourlySalary ?? '',
      out_of_hours: collected.outOfHours ?? '',
      reminders_status: collected.remindersStatus ?? '',
      urgency: collected.urgency ?? '',
      ...contactForm,
      role: 'Not specified',
      employee_count: '11 to 50',
    }
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, sdm_name: sdmName, sdm_email: sdmEmail }),
      })
      const data = await res.json()
      if (res.ok) router.push(`/results/${data.id}`)
    } catch {}
    setSubmitting(false)
  }

  const visibleMessages = messages.filter(m => m.content !== 'Start the audit.')
  const contactReady = contactForm.contact_name.trim() && contactForm.contact_email.trim() && contactForm.company_name.trim()
  const lastMsgIdx = visibleMessages.length - 1

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="shrink-0 h-14 border-b border-[#f0f0f0] flex items-center px-6 relative">
        <Image src="/kuhnic-logo.svg" alt="Kuhnic" width={100} height={26} className="h-[22px] w-auto" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#f0f0f0]">
          <div className="h-full bg-[#00c97d] transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Conversation feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-5 md:px-12 pb-8">
          {visibleMessages.map((msg, i) => {
            const isFirst = i === 0
            const isLastAssistant = msg.role === 'assistant' && i === lastMsgIdx && streaming

            return (
              <div key={i}>
                <div className={`${isFirst ? 'pt-12' : 'pt-6'}`}>
                  {msg.role === 'assistant' ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="text-[16px] leading-[1.7] text-[#111] whitespace-pre-line"
                    >
                      {isLastAssistant ? (
                        <StreamingMessage content={msg.content} onDone={handleStreamDone} />
                      ) : msg.content}
                    </motion.div>
                  ) : (
                    <motion.div
                      className="flex justify-end"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.12 }}
                    >
                      <div className="bg-[#f3f4f6] rounded-[18px] px-4 py-2.5 text-[15px] text-[#111] max-w-[72%]">
                        {msg.content}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Inline tiles — show after the last assistant message when streaming is done */}
                {msg.role === 'assistant' && i === lastMsgIdx && showInlineOptions && inlineOptions.length > 0 && (
                  <div className="pt-4 space-y-2">
                    <AnimatePresence>
                      {inlineOptions.map((opt, oi) => (
                        <motion.button
                          key={opt}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: oi * 0.06 }}
                          onClick={() => handleSendTile(opt)}
                          disabled={loading}
                          className="block w-full max-w-[480px] text-left bg-white border border-[#e5e7eb] rounded-[10px] px-[18px] py-3 text-[15px] text-[#111] hover:border-[#00c97d] hover:text-[#00c97d] transition-all duration-150 disabled:opacity-50"
                        >
                          {opt}
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="pt-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <div className="flex gap-1.5 py-2">
                  <div className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            </div>
          )}

          {/* Contact form inline */}
          {collected && (
            <div className="pt-8">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[480px] space-y-3">
                <p className="text-[14px] text-[#9ca3af] mb-2">Where should we send your report?</p>
                <input type="text" placeholder="Your name" value={contactForm.contact_name}
                  onChange={e => setContactForm(f => ({ ...f, contact_name: e.target.value }))}
                  className="w-full border-b border-[#e5e7eb] bg-transparent px-1 py-3 text-[16px] text-[#111] placeholder-[#9ca3af] focus:outline-none focus:border-[#00c97d] transition-colors" />
                <input type="email" placeholder="Work email" value={contactForm.contact_email}
                  onChange={e => setContactForm(f => ({ ...f, contact_email: e.target.value }))}
                  className="w-full border-b border-[#e5e7eb] bg-transparent px-1 py-3 text-[16px] text-[#111] placeholder-[#9ca3af] focus:outline-none focus:border-[#00c97d] transition-colors" />
                <input type="text" placeholder="Your website (e.g. company.co.uk)" value={contactForm.company_name}
                  onChange={e => setContactForm(f => ({ ...f, company_name: e.target.value }))}
                  className="w-full border-b border-[#e5e7eb] bg-transparent px-1 py-3 text-[16px] text-[#111] placeholder-[#9ca3af] focus:outline-none focus:border-[#00c97d] transition-colors" />
                <button onClick={handleSubmitContact} disabled={submitting || !contactReady}
                  className="w-full h-[52px] rounded-lg bg-[#00c97d] text-[15px] font-medium text-white hover:bg-[#00b873] transition-colors disabled:bg-[#e5e7eb] disabled:text-[#9ca3af]">
                  {submitting ? 'Calculating...' : 'Show Me My Number'}
                </button>
              </motion.div>
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* Fixed bottom bar — text input for open questions only */}
      <div className="shrink-0 bg-white">
        <div className="max-w-[760px] mx-auto px-5 md:px-12 py-3">
          {!streaming && !loading && isTextQuestion && !collected ? (
            <div>
              <div className="relative rounded-full border border-[#e0e0e0] bg-white shadow-[0_1px_6px_rgba(0,0,0,0.08)] overflow-hidden">
                <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendText()}
                  placeholder="Type your answer..."
                  className="w-full bg-transparent pl-5 pr-12 py-3.5 text-[15px] text-[#111] placeholder-[#9ca3af] focus:outline-none" />
                {textInput.trim() && (
                  <button onClick={handleSendText}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#00c97d] flex items-center justify-center text-white hover:bg-[#00b873] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#bbb] text-center mt-2">Collecting your information</p>
            </div>
          ) : (
            <p className="text-[11px] text-[#bbb] text-center py-1">Collecting your information</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatAuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><div className="text-[14px] text-[#999]">Loading...</div></div>}>
      <ChatAudit />
    </Suspense>
  )
}
