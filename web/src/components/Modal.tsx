import { useEffect } from 'react';
import type { ReactNode } from 'react';

// Универсальная модалка: оверлей, закрытие по Esc и клику по фону.
// Содержимое передаётся через children.
export default function Modal({ onClose, children }: {
    onClose: () => void;
    children: ReactNode;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-40 bg-night/90 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm bg-panel border border-line rounded-2xl p-6"
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}