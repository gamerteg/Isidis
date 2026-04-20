
import React from 'react'
import { logAnalyticsEvent } from '@/lib/actions/analytics'

interface ClickTrackerProps {
    gigId: string
    readerId: string
    eventType: 'click_buy'
    children: React.ReactNode
    className?: string
}

export function ClickTracker({ gigId, readerId, eventType, children, className }: ClickTrackerProps) {
    const handleClick = () => {
        logAnalyticsEvent(gigId, readerId, eventType)
    }

    return (
        <div onClick={handleClick} className={className}>
            {children}
        </div>
    )
}
