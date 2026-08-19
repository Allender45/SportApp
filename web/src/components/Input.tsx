import { useEffect, useRef, useState } from 'react';

// Универсальный инпут с подсказками: вводишь текст — снизу выпадает
// отфильтрованный список. Варианты подгружает функция loadOptions.
export default function Input({ value, onChange, placeholder, className, loadOptions }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    loadOptions: (query: string) => Promise<string[]>;
}) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<string[]>([]);
    const boxRef = useRef<HTMLDivElement>(null);

    // Загрузка подсказок с задержкой 200 мс (не дёргаем сервер на каждую букву)
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            loadOptions(value).then(setOptions).catch(() => setOptions([]));
        }, 200);
        return () => clearTimeout(timer);
    }, [value, open, loadOptions]);

    // Клик вне компонента закрывает список
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    return (
        <div ref={boxRef} className="relative">
            <input
                className={className}
                placeholder={placeholder}
                value={value}
                autoComplete="off"
                onFocus={() => setOpen(true)}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onKeyDown={e => {
                    if (e.key === 'Escape' && open) {
                        e.stopPropagation(); // не даём модалке закрыться
                        setOpen(false);
                    }
                }}
            />
            {open && options.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-1 bg-panel border border-line
                               rounded-xl max-h-48 overflow-y-auto shadow-xl shadow-black/40">
                    {options.map(o => (
                        <li key={o}>
                            <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-ink
                                           hover:bg-night transition-colors"
                                onMouseDown={e => {
                                    e.preventDefault(); // не даём инпуту потерять фокус до клика
                                    onChange(o);
                                    setOpen(false);
                                }}
                            >
                                {o}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}