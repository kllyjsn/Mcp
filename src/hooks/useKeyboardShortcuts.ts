import { useEffect } from 'react';
import { useStore } from '../stores/useStore';

export function useKeyboardShortcuts() {
  const { togglePlay, stopPlayback, generate, composition, toggleLoop } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (composition) togglePlay();
          break;
        case 'Escape':
          e.preventDefault();
          stopPlayback();
          break;
        case 'KeyG':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            generate();
          }
          break;
        case 'KeyL':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            toggleLoop();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stopPlayback, generate, composition, toggleLoop]);
}
