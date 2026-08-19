import { Clock } from 'lucide-react';

export default function StubPage({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-card border border-line flex items-center justify-center mb-4">
                <Clock size={24} className="text-cyan" />
            </div>
            <h1 className="text-ink text-lg font-bold">{title}</h1>
            <p className="text-dim text-sm mt-1">Раздел в разработке</p>
        </div>
    );
}