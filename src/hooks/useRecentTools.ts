import { useCallback, useEffect, useState } from "react";

const KEY = "recent_tools";
const MAX = 6;

export function useRecentTools() {
  // đọc localStorage 1 lần khi mount
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const j = localStorage.getItem(KEY);
      return j ? JSON.parse(j) : [];
    } catch {
      return [];
    }
  });

  // chỉ ghi localStorage khi recent đổi (KHÔNG setRecent ở đây nữa)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(recent));
    } catch {}
  }, [recent]);

  // push ổn định, không đổi identity mỗi render
  const push = useCallback((slug: string) => {
    if (!slug) return;
    setRecent(prev => {
      if (prev[0] === slug) return prev;               // không đổi state nếu phần tử đầu đã là slug
      const next = [slug, ...prev.filter(s => s !== slug)];
      return next.slice(0, MAX);
    });
  }, []);

  const clear = useCallback(() => setRecent([]), []);

  return { recent, push, clear };
}
