type WorkoutProgress = { id: string; number: number; done: number; total: number };

// Актуальная — следующая после самой старшей выполненной (по номеру).
// Если выполненных нет — первая невыполненная.
export function splitWorkouts<T extends WorkoutProgress>(workouts: T[]) {
    const isDone = (w: WorkoutProgress) => w.total > 0 && w.done === w.total;

    const completedNumbers = workouts.filter(isDone).map(w => w.number);
    const maxCompleted = completedNumbers.length ? Math.max(...completedNumbers) : 0;

    const current =
        workouts.find(w => w.number === maxCompleted + 1) ??
        workouts.find(w => !isDone(w));

    const history = workouts.filter(w => w.id !== current?.id && isDone(w));
    const upcoming = workouts.filter(w => w.id !== current?.id && !isDone(w));

    return { current, history, upcoming };
}