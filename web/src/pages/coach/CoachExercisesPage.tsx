import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

type Template = { id: string; name: string; imageUrl: string | null };

// /uploads/... → абсолютный URL на сервере
const fileUrl = (u: string) => new URL(u, api.defaults.baseURL).href;

export default function CoachExercisesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const [targetId, setTargetId] = useState<string | null>(null);

    const load = () => {
        api.get<Template[]>('/exercise-templates').then(res => setTemplates(res.data));
    };
    useEffect(load, []);

    const pickFile = (id: string) => {
        setTargetId(id);
        fileInput.current?.click();
    };

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !targetId) return;

        const form = new FormData();
        form.append('image', file);
        setUploadingId(targetId);
        try {
            await api.post(`/exercise-templates/${targetId}/image`, form);
            load();
        } finally {
            setUploadingId(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6">
            <h1 className="text-ink text-xl font-bold mb-1">Упражнения</h1>
            <p className="text-dim text-sm mb-6">
                Справочник названий и картинок. Пополняется автоматически при создании тренировок.
            </p>

            {/* Скрытый input для выбора файла */}
            <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.webp"
                   className="hidden" onChange={onFile} />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map(t => (
                    <div key={t.id}
                         className="bg-card border border-line rounded-2xl overflow-hidden">
                        <button
                            onClick={() => pickFile(t.id)}
                            className="relative w-full h-32 bg-night flex items-center justify-center
                                       text-dim hover:text-cyan transition-colors group"
                        >
                            {t.imageUrl ? (
                                <img src={fileUrl(t.imageUrl)} alt={t.name}
                                     className="w-full h-full object-cover" />
                            ) : (
                                <ImagePlus size={28} />
                            )}
                            {uploadingId === t.id && (
                                <span className="absolute inset-0 bg-night/70 flex items-center justify-center">
                                    <Loader2 size={24} className="animate-spin text-cyan" />
                                </span>
                            )}
                            <span className="absolute bottom-1 right-2 text-[10px] text-dim
                                             opacity-0 group-hover:opacity-100 transition-opacity">
                                заменить
                            </span>
                        </button>
                        <div className="px-4 py-3 text-ink text-sm font-medium">{t.name}</div>
                    </div>
                ))}
            </div>

            {templates.length === 0 && (
                <p className="text-dim text-center py-10">
                    Справочник пуст — он заполнится при создании тренировок
                </p>
            )}
        </div>
    );
}