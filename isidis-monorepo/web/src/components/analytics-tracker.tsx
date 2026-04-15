
import { useEffect, useRef } from 'react'
import { logAnalyticsEvent } from '@/app/actions/analytics'

interface AnalyticsTrackerProps {
    gigId: string
    readerId: string
    eventType: 'impression' | 'view' | 'click_buy'
    trigger?: 'mount' | 'visible' | 'manual'
}

export function AnalyticsTracker({ gigId, readerId, eventType, trigger = 'visible' }: AnalyticsTrackerProps) {
    const observerRef = useRef<HTMLDivElement>(null)
    const tracked = useRef(false)

    useEffect(() => {
        if (tracked.current) return

        if (trigger === 'manual') return

        if (trigger === 'mount') {
            logAnalyticsEvent(gigId, readerId, eventType)
            tracked.current = true
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !tracked.current) {
                        logAnalyticsEvent(gigId, readerId, eventType)
                        tracked.current = true
                        observer.disconnect()
                    }
                })
            },
            { threshold: 0.5 }
        )

        if (observerRef.current) {
            observer.observe(observerRef.current)
        }

        return () => observer.disconnect()
    }, [gigId, readerId, eventType, trigger])

    return <div ref={observerRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
}
