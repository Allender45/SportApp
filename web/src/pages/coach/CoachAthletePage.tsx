import {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {ArrowLeft, Plus} from 'lucide-react';
import {api} from '../../api/client';
import type {CoachAthleteDetail} from '../../api/types';
import { NewWorkoutModal } from '@/components'

const EXE_COLORS = ['bg-[#2A422A]', 'bg-[#422C2A]']

export default function CoachAthletePage() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [athlete, setAthlete] = useState<CoachAthleteDetail | null>(null);
    // const [notes, setNotes] = useState('');
    // const [notesSaved, setNotesSaved] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const load = () => {
        api.get<CoachAthleteDetail>(`/athletes/${id}`).then(res => {
            setAthlete(res.data);
            // setNotes(res.data.coachNotes ?? '');
        });
    };
    useEffect(load, [id]);

    // const saveNotes = async () => {
    //     await api.patch(`/athletes/${id}/notes`, {coachNotes: notes});
    //     setNotesSaved(true);
    //     setTimeout(() => setNotesSaved(false), 2000);
    // };

    if (!athlete) {
        return <div className="flex justify-center py-32"><span className="text-dim">Загрузка...</span></div>;
    }

    const fullName = [athlete.user.lastName, athlete.user.firstName, athlete.user.middleName]
        .filter(Boolean).join(' ');

    return (
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6">
            <button
                onClick={() => navigate('/coach')}
                className="flex items-center gap-1.5 text-dim hover:text-ink text-sm mb-4 transition-colors lg:hidden"
            >
                <ArrowLeft size={16}/> Все атлеты
            </button>



            {/*/!* Карточка атлета *!/*/}
            {/*<div className="bg-card border border-line rounded-2xl p-5 mb-6">*/}
            {/*    <h1 className="text-ink text-xl font-bold">{fullName}</h1>*/}

            {/*    /!* Приватные заметки *!/*/}
            {/*    <div className="mt-4 pt-4 border-t border-line">*/}
            {/*        <div className="flex items-center gap-1.5 text-dim text-xs mb-2">*/}
            {/*            <Lock size={12}/>*/}
            {/*            Заметки тренера (атлет их не видит)*/}
            {/*        </div>*/}
            {/*        <textarea*/}
            {/*            value={notes}*/}
            {/*            onChange={e => setNotes(e.target.value)}*/}
            {/*            placeholder="Травмы, ограничения, договорённости..."*/}
            {/*            rows={3}*/}
            {/*            className="w-full bg-night border border-line rounded-xl px-4 py-2.5 text-ink text-sm*/}
            {/*                       placeholder-dim/50 outline-none focus:border-cyan transition-colors resize-none"*/}
            {/*        />*/}
            {/*        <button*/}
            {/*            onClick={saveNotes}*/}
            {/*            className="mt-2 text-sm text-cyan hover:brightness-125 transition-all"*/}
            {/*        >*/}
            {/*            {notesSaved ? '✓ Сохранено' : 'Сохранить заметки'}*/}
            {/*        </button>*/}
            {/*    </div>*/}
            {/*</div>*/}

            {/* Программа тренировок — сетка карточек с таблицами */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-ink font-bold flex items-center gap-2 text-[24px]">{fullName}</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-ember-deep to-ember
                               hover:brightness-110 text-white text-sm font-semibold rounded-xl
                               px-4 py-2 transition-all shadow-lg shadow-ember/20"
                >
                    <Plus size={16} /> Тренировка
                </button>
            </div>

            {athlete.workouts.length === 0 && (
                <p className="text-dim text-center py-10">Программа пуста — создай первую тренировку</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {athlete.workouts.map(w => {
                    const total = w.exercises.length;
                    const done = w.exercises.filter(e => e.results[0]).length;
                    const completed = total > 0 && done === total;

                    return (
                        <button
                            key={w.id}
                            onClick={() => navigate(`/coach/athletes/${id}/workouts/${w.id}`)}
                            className="text-left bg-card border border-line rounded-2xl overflow-hidden
                                       hover:border-cyan/50 transition-colors"
                        >
                            {/* Шапка карточки */}
                            <div className="flex items-center justify-between px-4 py-3 bg-panel
                                            border-b border-line">
                                <span className="text-ink font-semibold text-sm">
                                    Тренировка #{w.number}
                                </span>
                                <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${
                                    completed
                                        ? 'bg-cyan/15 text-cyan'
                                        : 'text-dim'
                                }`}>
                                    {completed
                                        ? `✓ ${new Date(w.createdAt).toLocaleDateString('ru-RU')}`
                                        : `${done}/${total}`}
                                </span>
                            </div>

                            {/* Таблица упражнений */}
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="text-dim text-[10px] uppercase tracking-wider text-left
                                               border-b border-line/50">
                                    <th className="px-3 py-2">Упражнение</th>
                                    <th className="px-2 py-2 text-center w-14">Вес</th>
                                    <th className="px-2 py-2 text-center w-12">Подх.</th>
                                    <th className="px-2 py-2 text-center w-12">Повт.</th>
                                </tr>
                                </thead>
                                <tbody>
                                {w.exercises.map(e => {
                                    const status = e.results[0]?.status;
                                    return (
                                        <tr key={e.id} className="border-b border-line/30 last:border-0">
                                            <td className={`px-2 py-2 text-center text-dim ${
                                                status === 'DONE' ? EXE_COLORS[0]
                                                    : status === 'FAILED' ? EXE_COLORS[1]
                                                        : 'bg-line'
                                            }`}>{e.name}</td>
                                            <td className={`px-2 py-2 text-center text-dim ${
                                                status === 'DONE' ? EXE_COLORS[0]
                                                    : status === 'FAILED' ? EXE_COLORS[1]
                                                        : 'bg-line'
                                            }`}>
                                                {e.weight || '—'}
                                            </td>
                                            <td className={`px-2 py-2 text-center text-dim ${
                                                status === 'DONE' ? EXE_COLORS[0]
                                                    : status === 'FAILED' ? EXE_COLORS[1]
                                                        : 'bg-line'
                                            }`}>{e.sets}</td>
                                            <td className={`px-2 py-2 text-center text-dim ${
                                                status === 'DONE' ? EXE_COLORS[0]
                                                    : status === 'FAILED' ? EXE_COLORS[1]
                                                        : 'bg-line'
                                            }`}>{e.reps}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </button>
                    );
                })}
            </div>

            {/* Модалка новой тренировки */}
            {showForm && id && (
                <NewWorkoutModal
                    athleteId={id}
                    onClose={() => setShowForm(false)}
                    onCreated={workoutId => {
                        setShowForm(false);
                        navigate(`/coach/athletes/${id}/workouts/${workoutId}`);
                    }}
                />
            )}
        </div>
    );
}