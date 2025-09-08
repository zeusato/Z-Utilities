import { useEffect, useState } from 'react';
const KEY = 'shs_pinned';
export function usePinned() {
    const [pinned, setPinned] = useState([]);
    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw)
                setPinned(JSON.parse(raw));
        }
        catch { }
    }, []);
    const toggle = (slug) => {
        setPinned(prev => {
            const has = prev.includes(slug);
            const next = has ? prev.filter(s => s !== slug) : [slug, ...prev];
            localStorage.setItem(KEY, JSON.stringify(next));
            return next;
        });
    };
    return { pinned, toggle };
}
