
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface PresenceContextType {
    onlineUsers: Set<string>
}

const PresenceContext = createContext<PresenceContextType>({
    onlineUsers: new Set()
})

export const usePresence = () => useContext(PresenceContext)

export function PresenceProvider({ children }: { children: React.ReactNode }) {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
    const [user, setUser] = useState<User | null>(null)
    // Fix: Ensure supabase client is stable across renders
    const [supabase] = useState(() => createClient())

    // 1. Check for current user to track presence
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            console.log('PresenceProvider: Current User:', user?.id)
            setUser(user)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('PresenceProvider: Auth Change:', _event, session?.user?.id)
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    // 2. Presence Logic — only connect WebSocket if authenticated
    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        let channel = supabase.channel('global_presence', {
            config: {
                presence: {
                    key: user ? user.id : 'anonymous',
                },
            },
        });

        const setupPresence = async () => {
            channel
                .on('presence', { event: 'sync' }, () => {
                    if (!isMounted) return;
                    const newState = channel.presenceState();
                    const onlineIds = new Set<string>();

                    for (const id in newState) {
                        const presences = newState[id] as { user_id?: string }[];
                        presences.forEach(p => {
                            if (p.user_id) onlineIds.add(p.user_id);
                        });
                    }

                    setOnlineUsers(new Set(onlineIds));
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    console.log('join', key, newPresences)
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    console.log('leave', key, leftPresences)
                })
                .subscribe(async (status) => {
                    console.log('Presence Status:', status);
                    if (status === 'SUBSCRIBED') {
                        if (user) {
                            try {
                                await channel.track({
                                    user_id: user.id,
                                    online_at: new Date().toISOString(),
                                });
                                console.log('Successfully tracked user:', user.id);
                            } catch (e) {
                                console.error('Error tracking presence', e);
                            }
                        }
                    }
                });
        };

        setupPresence();

        const handleUnload = () => {
            if (user) {
                channel.untrack().catch(() => { });
            }
            supabase.removeChannel(channel);
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            isMounted = false;
            window.removeEventListener('beforeunload', handleUnload);
            if (user) {
                channel.untrack().catch(() => { });
            }
            supabase.removeChannel(channel);
        };
    }, [supabase, user]); // Re-run if user changes to track/untrack

    return (
        <PresenceContext.Provider value={{ onlineUsers }}>
            {children}
        </PresenceContext.Provider>
    )
}
