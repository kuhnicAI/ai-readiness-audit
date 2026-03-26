'use client'

import { useRef, useEffect, useState, ReactNode } from 'react'

interface ScrollStackItemProps {
  children: ReactNode
  index?: number
  total?: number
}

export function ScrollStackItem({ children, index = 0, total = 1 }: ScrollStackItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // Start animating when top hits 80% of viewport, fully stacked at 20%
      const raw = 1 - (rect.top - vh * 0.2) / (vh * 0.6)
      setProgress(Math.max(0, Math.min(1, raw)))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isLast = index === total - 1
  // Cards stack with slight scale-down and upward offset as they scroll
  const scale = isLast ? 1 : 1 - (1 - progress) * 0.05
  const y = isLast ? 0 : (1 - progress) * 40

  return (
    <div
      ref={ref}
      className="sticky top-[20vh]"
      style={{
        zIndex: index + 1,
        transform: `translateY(${y}px) scale(${scale})`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111]/95 backdrop-blur-sm px-8 md:px-12 py-10 md:py-14 mb-4">
        {children}
      </div>
    </div>
  )
}

interface ScrollStackProps {
  children: ReactNode
}

export default function ScrollStack({ children }: ScrollStackProps) {
  const items = Array.isArray(children) ? children : [children]
  const total = items.length

  return (
    <div className="relative">
      {items.map((child, i) => {
        if (!child) return null
        // Clone the ScrollStackItem with index and total props
        const props = { index: i, total, key: i }
        if (typeof child === 'object' && 'type' in child && child.type === ScrollStackItem) {
          return <ScrollStackItem {...props}>{child.props.children}</ScrollStackItem>
        }
        return <ScrollStackItem {...props}>{child}</ScrollStackItem>
      })}
    </div>
  )
}
