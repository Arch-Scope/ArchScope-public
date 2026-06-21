import { useState, useCallback, useRef, useEffect } from 'react';

interface UseResizableReturn {
  size: number;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function useResizable(
  initial: number,
  min: number,
  max: number,
  inverted = false,
  direction: 'horizontal' | 'vertical' = 'horizontal'
): UseResizableReturn {
  const sizeRef = useRef(initial);
  const [size, setSize] = useState(initial);
  const startPos = useRef(0);
  const startSize = useRef(initial);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSize.current = sizeRef.current;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      const delta = direction === 'horizontal' 
        ? (ev.clientX - startPos.current) 
        : (ev.clientY - startPos.current);
      const adjustedDelta = delta * (inverted ? -1 : 1);
      const next = Math.min(max, Math.max(min, startSize.current + adjustedDelta));
      sizeRef.current = next;
      setSize(next);
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [min, max, inverted, direction]);

  return { size, onMouseDown };
}
