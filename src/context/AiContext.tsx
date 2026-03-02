'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type AiMode = 'chat' | 'navigate' | 'scan' | 'hint';

export interface AiMessage {
    role: 'user' | 'assistant';
    content: string;
    mode?: AiMode;
    timestamp: number;
}

export interface AiState {
    messages: AiMessage[];
    isOpen: boolean;
    isLoading: boolean;
    isListening: boolean;
    holoText: string | null;
    holoVisible: boolean;
    visitedSections: Set<string>;
    orbPulsing: boolean;
}

interface AiContextValue extends AiState {
    openChat: () => void;
    closeChat: () => void;
    sendMessage: (text: string, mode?: AiMode) => Promise<string>;
    scanObject: (sectionId: string) => Promise<void>;
    navigateByVoice: (command: string) => Promise<string | null>;
    requestHint: () => Promise<void>;
    markVisited: (section: string) => void;
    showHolo: (text: string) => void;
    dismissHolo: () => void;
    startListening: () => void;
    stopListening: () => void;
    setOrbPulsing: (v: boolean) => void;
}

const AiContext = createContext<AiContextValue | null>(null);

export function useAi() {
    const ctx = useContext(AiContext);
    if (!ctx) throw new Error('useAi must be used within AiProvider');
    return ctx;
}

const SECTIONS = ['hero', 'experience', 'skills', 'contact'];

export function AiProvider({ children }: { children: React.ReactNode }) {
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [holoText, setHoloText] = useState<string | null>(null);
    const [holoVisible, setHoloVisible] = useState(false);
    const [visitedSections, setVisitedSections] = useState<Set<string>>(new Set(['hero']));
    const [orbPulsing, setOrbPulsing] = useState(false);
    const holoTimer = useRef<NodeJS.Timeout | null>(null);

    const showHolo = useCallback((text: string) => {
        setHoloText(text);
        setHoloVisible(true);
        if (holoTimer.current) clearTimeout(holoTimer.current);
        holoTimer.current = setTimeout(() => {
            setHoloVisible(false);
            setTimeout(() => setHoloText(null), 600);
        }, 12000);
    }, []);

    const dismissHolo = useCallback(() => {
        setHoloVisible(false);
        setTimeout(() => setHoloText(null), 600);
    }, []);

    const sendMessage = useCallback(async (text: string, mode: AiMode = 'chat'): Promise<string> => {
        const userMsg: AiMessage = { role: 'user', content: text, mode, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setOrbPulsing(true);

        // Minimum visualization time — let the neural network animate dramatically
        const MIN_VIZ_MS = 10_000; // 10 seconds
        const vizStart = Date.now();

        try {
            // Fire API call in parallel with the visualization timer
            const [res] = await Promise.all([
                fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: text }],
                        mode,
                        visitedSections: Array.from(visitedSections),
                    }),
                }),
                // Ensure we wait at least MIN_VIZ_MS
                new Promise(resolve => setTimeout(resolve, MIN_VIZ_MS)),
            ]);

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                const apiMsg = errorData?.content || 'Signal disrupted — data relay offline.';
                throw new Error(apiMsg);
            }
            const data = await res.json();
            const reply = data.content || 'Signal lost... please try again.';

            // If the API was faster than MIN_VIZ_MS, the Promise.all already waited.
            // If somehow we got here early, wait the remaining time.
            const elapsed = Date.now() - vizStart;
            if (elapsed < MIN_VIZ_MS) {
                await new Promise(resolve => setTimeout(resolve, MIN_VIZ_MS - elapsed));
            }

            const assistantMsg: AiMessage = { role: 'assistant', content: reply, mode, timestamp: Date.now() };
            setMessages(prev => [...prev, assistantMsg]);

            // Show holographic response
            showHolo(reply);

            return data.navigateTo || reply;
        } catch (err) {
            // Even on error, wait for the visualization to finish
            const elapsed = Date.now() - vizStart;
            if (elapsed < MIN_VIZ_MS) {
                await new Promise(resolve => setTimeout(resolve, MIN_VIZ_MS - elapsed));
            }

            const fallback = err instanceof Error && err.message !== 'API error'
                ? err.message
                : "Interference detected — I can't reach the data relay right now. Try again in a moment!";
            setMessages(prev => [...prev, { role: 'assistant', content: fallback, timestamp: Date.now() }]);
            showHolo(fallback);
            return fallback;
        } finally {
            setIsLoading(false);
            setTimeout(() => setOrbPulsing(false), 1500);
        }
    }, [visitedSections, showHolo]);

    const scanObject = useCallback(async (sectionId: string) => {
        await sendMessage(`Scan the ${sectionId} section and give me an engaging holographic summary.`, 'scan');
        markVisited(sectionId);
    }, [sendMessage]);

    const navigateByVoice = useCallback(async (command: string): Promise<string | null> => {
        setIsLoading(true);
        setOrbPulsing(true);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: command }],
                    mode: 'navigate',
                }),
            });
            const data = await res.json();

            if (data.navigateTo && SECTIONS.includes(data.navigateTo)) {
                showHolo(data.content || `Navigating to ${data.navigateTo}...`);
                // Smooth scroll to section
                const el = document.getElementById(data.navigateTo);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                markVisited(data.navigateTo);
                return data.navigateTo;
            } else {
                // Treat as regular chat
                showHolo(data.content || "I didn't understand that navigation command.");
                return null;
            }
        } catch {
            showHolo("Navigation relay offline — try scrolling manually!");
            return null;
        } finally {
            setIsLoading(false);
            setTimeout(() => setOrbPulsing(false), 1500);
        }
    }, [showHolo]);

    const requestHint = useCallback(async () => {
        const unvisited = SECTIONS.filter(s => !visitedSections.has(s));
        const hint = unvisited.length > 0
            ? `Try exploring the ${unvisited[0]} section next!`
            : "You've explored everything! Ask me about any section for deeper insights.";
        await sendMessage("What should I explore next?", 'hint');
    }, [visitedSections, sendMessage]);

    const markVisited = useCallback((section: string) => {
        setVisitedSections(prev => {
            const next = new Set(prev);
            next.add(section);
            return next;
        });
    }, []);

    const openChat = useCallback(() => setIsOpen(true), []);
    const closeChat = useCallback(() => setIsOpen(false), []);
    const startListening = useCallback(() => setIsListening(true), []);
    const stopListening = useCallback(() => setIsListening(false), []);

    return (
        <AiContext.Provider value={{
            messages, isOpen, isLoading, isListening, holoText, holoVisible,
            visitedSections, orbPulsing,
            openChat, closeChat, sendMessage, scanObject, navigateByVoice,
            requestHint, markVisited, showHolo, dismissHolo,
            startListening, stopListening, setOrbPulsing,
        }}>
            {children}
        </AiContext.Provider>
    );
}
