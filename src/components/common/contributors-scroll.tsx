'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contributor {
  username: string;
  profileUrl: string;
  avatarUrl: string;
}

const SCROLL_STEP = 160; // px moved per arrow click

export function ContributorsScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ widthPct: 100, leftPct: 0 });
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contributors')
      .then((res) => res.json())
      .then((data) => setContributors(data.contributors ?? []))
      .catch(() => setContributors([]))
      .finally(() => setLoading(false));
  }, []);

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    const widthPct = Math.min(100, (clientWidth / scrollWidth) * 100);
    const maxScroll = scrollWidth - clientWidth;
    const leftPct = maxScroll > 0 ? (scrollLeft / maxScroll) * (100 - widthPct) : 0;
    setThumb({ widthPct, leftPct });
  }, []);

  const scrollBy = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -SCROLL_STEP : SCROLL_STEP, behavior: 'smooth' });
  };

  if (loading) {
    return <div className="text-sm text-gray-400 pt-1">Loading contributors…</div>;
  }

  if (contributors.length === 0) return null;

  return (
    <div className="pt-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Scroll contributors left"
          onClick={() => scrollBy('left')}
          className="shrink-0 rounded-full border p-1.5 text-gray-500 hover:text-cyan-600 hover:border-cyan-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          onScroll={updateThumb}
          className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {contributors.map((c) => (
            <a
              key={c.username}
              href={c.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={c.username}
              className="shrink-0"
            >
              <img
                src={c.avatarUrl}
                alt={c.username}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full border object-cover hover:ring-2 hover:ring-cyan-500 transition-all"
              />
            </a>
          ))}
        </div>

        <button
          type="button"
          aria-label="Scroll contributors right"
          onClick={() => scrollBy('right')}
          className="shrink-0 rounded-full border p-1.5 text-gray-500 hover:text-cyan-600 hover:border-cyan-600 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* decorative scroll position indicator */}
      <div className="mt-2 ml-8 mr-8 h-1 rounded-full bg-gray-200">
        <div
          className={cn('h-1 rounded-full bg-gray-400 transition-all')}
          style={{ width: `${thumb.widthPct}%`, marginLeft: `${thumb.leftPct}%` }}
        />
      </div>
    </div>
  );
}
