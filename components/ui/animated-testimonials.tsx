'use client'

import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

type Testimonial = {
  quote: string
  name: string
  designation: string
  src: string
}

export const AnimatedTestimonials = ({
  testimonials,
  autoplay = false,
  className,
}: {
  testimonials: Testimonial[]
  autoplay?: boolean
  className?: string
}) => {
  const [active, setActive] = useState(0)

  // Pre-compute rotations so they don't change on every render
  const rotations = useMemo(
    () => testimonials.map(() => Math.floor(Math.random() * 21) - 10),
    [testimonials]
  )

  const [lastInteraction, setLastInteraction] = useState(0)

  const handleNext = useCallback(() => {
    setActive((prev) => (prev + 1) % testimonials.length)
    setLastInteraction(Date.now())
  }, [testimonials.length])

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    setLastInteraction(Date.now())
  }

  const isActive = (index: number) => {
    return index === active
  }

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(() => {
        // Only auto-advance if no manual interaction in the last 8 seconds
        if (Date.now() - lastInteraction > 8000) {
          setActive((prev) => (prev + 1) % testimonials.length)
        }
      }, 8000)
      return () => clearInterval(interval)
    }
  }, [autoplay, testimonials.length, lastInteraction])

  return (
    <div className={cn('max-w-sm md:max-w-5xl mx-auto px-4 md:px-8 lg:px-12 py-20', className)}>
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-20">
        <div>
          <div className="relative h-64 w-64 mx-auto md:mx-0">
            <AnimatePresence>
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.src}
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                    z: -100,
                    rotate: rotations[index],
                  }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.7,
                    scale: isActive(index) ? 1 : 0.95,
                    z: isActive(index) ? 0 : -100,
                    rotate: isActive(index) ? 0 : rotations[index],
                    zIndex: isActive(index)
                      ? 999
                      : testimonials.length + 2 - index,
                    y: isActive(index) ? [0, -40, 0] : 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    z: 100,
                    rotate: rotations[index],
                  }}
                  transition={{
                    duration: 0.4,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 origin-bottom"
                >
                  {testimonial.src ? (
                    <Image
                      src={testimonial.src}
                      alt={testimonial.name}
                      width={400}
                      height={400}
                      draggable={false}
                      className="h-full w-full rounded-3xl object-cover object-center"
                    />
                  ) : (
                    <div className="h-full w-full rounded-3xl bg-[#f0f0f0] flex items-center justify-center">
                      <span className="text-[48px] font-bold text-[#ccc]">
                        {testimonial.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex justify-between flex-col py-4">
          <motion.div
            key={active}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <h3 className="text-2xl font-bold text-[#1a1a2e]">
              {testimonials[active].name}
            </h3>
            <p className="text-sm text-[#888]">
              {testimonials[active].designation}
            </p>
            <motion.p className="text-lg text-[#555] mt-8">
              {testimonials[active].quote.split(' ').map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ filter: 'blur(10px)', opacity: 0, y: 5 }}
                  animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: 'easeInOut',
                    delay: 0.02 * index,
                  }}
                  className="inline-block"
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.p>
          </motion.div>
          <div className="flex gap-4 pt-12 md:pt-0">
            <button
              onClick={handlePrev}
              className="h-7 w-7 rounded-full bg-[#f0f0f0] flex items-center justify-center group/button"
            >
              <IconArrowLeft className="h-5 w-5 text-[#1a1a2e] group-hover/button:rotate-12 transition-transform duration-300" />
            </button>
            <button
              onClick={handleNext}
              className="h-7 w-7 rounded-full bg-[#f0f0f0] flex items-center justify-center group/button"
            >
              <IconArrowRight className="h-5 w-5 text-[#1a1a2e] group-hover/button:-rotate-12 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
