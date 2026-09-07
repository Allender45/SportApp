import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Play, Pause, RotateCcw } from 'lucide-react';
import { api, fileUrl } from '@/api';
import { Modal } from '@/components';
import type { WorkoutDetail } from '@/api';
import { plural } from '@shared/utils';

export default function AthleteWorkoutDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
    const [doneSets, setDoneSets] = useState<Record<string, number>>(() => {
        try {
            return JSON.parse(sessionStorage.getItem(`doneSets:${id}`) ?? '{}');
        } catch {
            return {};
        }
    });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [comment, setComment] = useState('');
    const [timerState, setTimerState] = useState<{ running: boolean; startedAt: number | null }>(() => {
        try {
            return JSON.parse(sessionStorage.getItem(`timer:${id}`) ?? '{"running":false,"startedAt":null}');
        } catch {
            return { running: false, startedAt: null };
        }
    });
    const [seconds, setSeconds] = useState(() =>
        timerState.startedAt !== null
            ? Math.floor((Date.now() - timerState.startedAt) / 1000)
            : 0);
    const running = timerState.running;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        sessionStorage.setItem(`doneSets:${id}`, JSON.stringify(doneSets));
    }, [doneSets, id]);

    useEffect(() => {
        api.get<WorkoutDetail>(`/my/workouts/${id}`).then(res => setWorkout(res.data));
    }, [id]);

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        sessionStorage.setItem(`timer:${id}`, JSON.stringify(timerState));
        if (!timerState.running || timerState.startedAt === null) return;
        timerRef.current = setInterval(() => {
            setSeconds(Math.floor((Date.now() - timerState.startedAt!) / 1000));
        }, 500);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timerState, id]);

    const toggleTimer = () => {
        if (running) {
            // пауза: запоминаем накопленное как сдвиг
            setTimerState({ running: false, startedAt: Date.now() - seconds * 1000 });
        } else {
            setTimerState({ running: true, startedAt: Date.now() - seconds * 1000 });
        }
    };

    const resetTimer = () => {
        setTimerState({ running: false, startedAt: null });
        setSeconds(0);
    };

    const fmt = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // --- счётчик подходов ---
    const bumpSets = (exId: string, delta: number, max: number) => {
        setDoneSets(prev => {
            const next = Math.min(Math.max((prev[exId] ?? 0) + delta, 0), max);
            if (next === max && (prev[exId] ?? 0) < max) {
                // все подходы отмечены — предлагаем зафиксировать результат
                const ex = workout?.exercises.find(e => e.id === exId);
                setSelectedId(exId);
                setComment(ex?.lastResult?.athleteComment ?? '');
            }
            return { ...prev, [exId]: next };
        });
    };

    // --- отметка результата через модалку ---
    const selected = workout?.exercises.find(e => e.id === selectedId) ?? null;

    const mark = async (status: 'DONE' | 'FAILED') => {
        if (!workout || !selected) return;
        await api.post(`/my/exercises/${selected.id}/result`, {
            status,
            athleteComment: comment.trim() || undefined,
        });
        setWorkout({
            ...workout,
            exercises: workout.exercises.map(e =>
                e.id === selected.id
                    ? { ...e, lastResult: { id: '', status, athleteComment: comment || null, completedAt: new Date().toISOString() } }
                    : e),
        });
        setSelectedId(null);
        setComment('');
    };

    if (!workout) {
        return <div className="flex justify-center py-32"><span className="text-dim">Загрузка...</span></div>;
    }

    return (
        <div className="max-w-xl mx-auto px-4 pt-6 pb-28">
            <div className="flex items-center gap-2 mb-5">
                <button onClick={() => navigate('/my')}
                        className="text-dim hover:text-ink transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-cyan text-sm font-bold tracking-[0.25em]">
                    ТРЕНИРОВКА #{workout.number}
                </h1>
            </div>

            <div className="space-y-3">
                {workout.exercises.map(e => {
                    const done = doneSets[e.id] ?? 0;
                    const status = e.lastResult?.status;
                    return (
                        <div
                            key={e.id}
                            onClick={() => { setSelectedId(e.id); setComment(e.lastResult?.athleteComment ?? ''); }}
                            className="relative h-28 rounded-2xl overflow-hidden border border-line
                                       bg-card cursor-pointer hover:border-cyan/40 transition-colors"
                        >
                            {/* Картинка справа с затуханием влево */}
                            {e.imageUrl && (
                                <div className="absolute inset-y-0 right-0 w-3/5">
                                    <img src={fileUrl(e.imageUrl)} alt=""
                                         className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-linear-to-r from-card via-card/70 to-transparent" />
                                    {/* растягиваем затухание за левый край картинки */}
                                    <div className="absolute inset-y-0 -left-16 w-16 bg-linear-to-r from-card to-transparent" />
                                </div>
                            )}

                            {status === 'DONE' && (
                                <div className="absolute inset-y-0 left-0 w-2/5 pointer-events-none
                                                bg-linear-to-r from-green-500/25 to-transparent" />
                            )}
                            {status === 'FAILED' && (
                                <div className="absolute inset-y-0 left-0 w-2/5 pointer-events-none
                                                bg-linear-to-r from-red-500/25 to-transparent" />
                            )}

                            <div className="relative h-full flex flex-col justify-center px-5">
                                <div className="text-ink font-bold uppercase tracking-wide">{e.name} {e.weight != 0 && ` - ${e.weight} кг`}</div>

                                {/* Счётчик подходов: минус / полоски / плюс */}
                                <div className="flex items-center gap-3 mt-2">
                                    <button
                                        onClick={(ev) => {
                                            ev.stopPropagation()
                                            bumpSets(e.id, -1, e.sets)
                                        }}
                                        className="w-7 h-7 rounded-full bg-panel border border-line
                                                   flex items-center justify-center text-dim hover:text-ink"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <div className="flex gap-1">
                                        {Array.from({ length: e.sets }).map((_, i) => (
                                            <span key={i}
                                                  className={`w-1.5 h-5 rounded-full ${
                                                      i < done ? 'bg-cyan' : 'bg-line'}`} />
                                        ))}
                                    </div>
                                    <button
                                        onClick={(ev) => {
                                            ev.stopPropagation()
                                            bumpSets(e.id, 1, e.sets)
                                        }}
                                        className="w-7 h-7 rounded-full bg-panel border border-line
                                                   flex items-center justify-center text-dim hover:text-ink"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                <div className="text-dim text-sm mt-1.5">
                                    {e.reps} {plural(e.reps, 'повторение', 'повторения', 'повторений')}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Таймер — фиксирован внизу */}
            <div className="fixed bottom-0 left-0 right-0 bg-night/95 backdrop-blur border-t border-line
                            lg:left-60">
                <div className="max-w-xl mx-auto px-6 py-3 flex items-center justify-between">
                    <span className="text-ink text-3xl font-bold tabular-nums">{fmt(seconds)}</span>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTimer}
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-deep to-cyan
                                       text-night flex items-center justify-center
                                       hover:brightness-110 transition-all shadow-lg shadow-cyan/25"
                        >
                            {running ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                        </button>
                        <button onClick={resetTimer}
                                className="w-10 h-10 rounded-full bg-panel border border-line
                                           text-dim hover:text-ink flex items-center justify-center transition-colors">
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Модалка результата */}
            {selected && (
                <Modal onClose={() => setSelectedId(null)}>
                    <div className="text-ink font-bold mb-1">{selected.name}</div>
                    <div className="text-dim text-sm mb-4">
                        {selected.sets} × {selected.reps}
                        {selected.weight > 0 && ` · ${selected.weight} кг`}
                    </div>
                    {selected.trainerNote && (
                        <p className="text-cyan/80 text-sm bg-cyan/5 border border-cyan/20
                                      rounded-xl px-3 py-2 mb-4">
                            Тренер: {selected.trainerNote}
                        </p>
                    )}
                    <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Комментарий тренеру (необязательно)"
                        rows={2}
                        className="w-full bg-night border border-line rounded-xl px-4 py-2.5 text-ink text-sm
                                   placeholder-dim/50 outline-none focus:border-cyan transition-colors resize-none"
                    />
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                            onClick={() => mark('FAILED')}
                            className="bg-ember/10 text-ember font-semibold rounded-xl py-3
                                       hover:bg-ember/20 transition-colors"
                        >
                            Не получилось
                        </button>
                        <button
                            onClick={() => mark('DONE')}
                            className="bg-cyan text-night font-bold
                                       rounded-xl py-3 hover:brightness-110 transition-all"
                        >
                            Сделал
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}