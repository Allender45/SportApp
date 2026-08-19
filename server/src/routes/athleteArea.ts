import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('ATHLETE'));

// Находим профиль атлета по userId из токена
async function myAthleteId(userId: string): Promise<string | null> {
    const profile = await prisma.athlete.findUnique({ where: { userId } });
    return profile?.id ?? null;
}

// GET /my/workouts — мои тренировки с прогрессом
router.get('/workouts', async (req, res) => {
    const athleteId = await myAthleteId(req.user!.userId);
    if (!athleteId) {
        res.status(404).json({ error: 'Профиль атлета не найден' });
        return;
    }

    const workouts = await prisma.workout.findMany({
        where: { athleteId },
        orderBy: { number: 'asc' },
        include: {
            exercises: {
                include: { results: { orderBy: { completedAt: 'desc' }, take: 1 } },
            },
        },
    });

    res.json(workouts.map(w => {
        const latestDates = w.exercises
            .map(e => e.results[0]?.completedAt)
            .filter((d): d is Date => !!d);
        return {
            id: w.id,
            number: w.number,
            title: w.title,
            total: w.exercises.length,
            done: w.exercises.filter(e => e.results[0]).length,
            latestDate: latestDates.length
                ? new Date(Math.max(...latestDates.map(d => d.getTime())))
                : null,
        };
    }));
});

// GET /my/workouts/:id — тренировка с упражнениями и моим последним результатом
router.get('/workouts/:id', async (req, res) => {
    const athleteId = await myAthleteId(req.user!.userId);
    if (!athleteId) {
        res.status(404).json({ error: 'Профиль атлета не найден' });
        return;
    }

    const workout = await prisma.workout.findFirst({
        where: { id: req.params.id, athleteId },
        include: {
            exercises: {
                orderBy: { order: 'asc' },
                include: { results: { orderBy: { completedAt: 'desc' }, take: 1 } },
            },
        },
    });
    if (!workout) {
        res.status(404).json({ error: 'Тренировка не найдена' });
        return;
    }

    const names = workout.exercises.map(e => e.name);
    const templates = await prisma.exerciseTemplate.findMany({
        where: { name: { in: names } },
        select: { name: true, imageUrl: true },
    });
    const imageByName = new Map(templates.map(t => [t.name, t.imageUrl]));

    res.json({
        id: workout.id,
        number: workout.number,
        title: workout.title,
        exercises: workout.exercises.map(e => ({
            id: e.id,
            order: e.order,
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            trainerNote: e.trainerNote,
            lastResult: e.results[0] ?? null,
            imageUrl: imageByName.get(e.name) ?? null,
        })),
    });
});

// POST /my/exercises/:id/result — отметить выполнение
router.post('/exercises/:id/result', async (req, res) => {
    const parsed = z.object({
        status: z.enum(['DONE', 'FAILED']),
        athleteComment: z.string().optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Некорректные данные' });
        return;
    }

    const athleteId = await myAthleteId(req.user!.userId);
    if (!athleteId) {
        res.status(404).json({ error: 'Профиль атлета не найден' });
        return;
    }

    // Проверяем, что упражнение — из тренировки ЭТОГО атлета
    const exercise = await prisma.exercise.findFirst({
        where: { id: req.params.id, workout: { athleteId } },
    });
    if (!exercise) {
        res.status(404).json({ error: 'Упражнение не найдено' });
        return;
    }

    const result = await prisma.result.create({
        data: {
            exerciseId: exercise.id,
            status: parsed.data.status,
            athleteComment: parsed.data.athleteComment,
        },
    });
    res.status(201).json(result);
});

export default router;