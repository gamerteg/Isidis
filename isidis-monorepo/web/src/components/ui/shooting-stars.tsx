
import React, { useEffect, useState } from 'react'

export function ShootingStars() {
    const [stars, setStars] = useState<{ id: number; top: string; left: string; delay: string; duration: string; size: string }[]>([])
    const [shootingStars, setShootingStars] = useState<{ id: number; top: string; left: string; delay: string; duration: string; key: number }[]>([])

    useEffect(() => {
        // Generate static stars
        const initialStars = Array.from({ length: 150 }).map((_, i) => ({
            id: i,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            delay: `${Math.random() * 5}s`,
            duration: `${2 + Math.random() * 4}s`,
            size: `${0.5 + Math.random() * 1.5}px`
        }))
        setStars(initialStars)

        // Function to create a shooting star
        const createShootingStar = () => {
            const now = Date.now()
            const newShootingStar = {
                id: now,
                key: now,
                top: `${Math.random() * 40}%`,
                left: `${Math.random() * 100}%`,
                delay: '0s',
                duration: `${1.5 + Math.random() * 1.5}s`
            }
            setShootingStars(prev => [...prev.slice(-3), newShootingStar])

            // Remove after animation
            setTimeout(() => {
                setShootingStars(prev => prev.filter(s => s.id !== now))
            }, 3000)
        }

        // Interval for shooting stars
        const shootingInterval = setInterval(() => {
            if (Math.random() > 0.6) {
                createShootingStar()
            }
        }, 2000)

        return () => clearInterval(shootingInterval)
    }, [])

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-gradient-to-b from-[#050510] via-[#090920] to-[#050505]">
            {/* Stars */}
            {stars.map(star => (
                <div
                    key={star.id}
                    className="absolute rounded-full bg-white opacity-40 animate-pulse"
                    style={{
                        top: star.top,
                        left: star.left,
                        width: star.size,
                        height: star.size,
                        animationDelay: star.delay,
                        animationDuration: star.duration,
                        boxShadow: '0 0 5px rgba(255, 255, 255, 0.3)'
                    }}
                />
            ))}

            {/* Shooting Stars */}
            {shootingStars.map(star => (
                <div
                    key={star.key}
                    className="absolute w-[100px] h-[1px] bg-gradient-to-r from-transparent via-white/80 to-white rounded-full"
                    style={{
                        top: star.top,
                        left: star.left,
                        animation: `shoot ${star.duration} linear forwards`,
                        boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                        transform: 'rotate(-35deg) translateX(0)',
                        opacity: 0
                    }}
                />
            ))}

            {/* Mystic Glow */}
            <div className="absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(circle_at_50%_0%,rgba(120,80,250,0.1),transparent_70%)] mix-blend-screen" />

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shoot {
                    0% {
                        opacity: 0;
                        transform: rotate(-35deg) translateX(0) scaleX(0.1);
                    }
                    10% {
                        opacity: 1;
                        transform: rotate(-35deg) translateX(0) scaleX(1);
                    }
                    90% {
                        opacity: 1;
                        transform: rotate(-35deg) translateX(-600px) scaleX(1);
                    }
                    100% {
                        opacity: 0;
                        transform: rotate(-35deg) translateX(-800px) scaleX(0.1);
                    }
                }
            ` }} />
        </div>
    )
}
