import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Все роуты в этом файле — только для авторизованного тренера
router.use(requireAuth, requireRole('COACH', 'ADMIN'));

// 1. Схема — без email, с фамилией и именем
const createAthleteSchema = z.object({
    lastName: z.string().min(1),
    firstName: z.string().min(1),
    phone: z.string().min(5),
    password: z.string().min(6),
});

// POST /athletes — тренер создаёт атлета (User + Athlete в одной транзакции)
router.post('/', async (req, res) => {
    const parsed = createAthleteSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Некорректные данные', details: parsed.error.flatten() });
        return;
    }

    const { lastName, firstName, phone, password } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) {
        res.status(409).json({ error: 'Пользователь с таким телефоном уже есть' });
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            lastName, firstName, phone, passwordHash,
            role: 'ATHLETE',
            athleteProfile: { create: { coachId: req.user!.userId } },
        },
        select: { id: true, lastName: true, firstName: true, phone: true,
            athleteProfile: { select: { id: true } } },
    });

    res.status(201).json(user);
});

// GET /athletes — список атлетов текущего тренера
router.get('/', async (req, res) => {
    const athletes = await prisma.athlete.findMany({
        where: { coachId: req.user!.userId },
        select: {
            id: true,
            coachNotes: true,
            user: { select: { id: true, lastName: true, firstName: true, phone: true, active: true } },
            _count: { select: { workouts: true } },
        },
        orderBy: { user: { lastName: 'asc' } },
    });
    res.json(athletes);
});

// PATCH /athletes/:id/notes — приватные заметки тренера
router.patch('/:id/notes', async (req, res) => {
    const parsed = z.object({ coachNotes: z.string() }).safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Нужно поле coachNotes (строка)' });
        return;
    }

    const result = await prisma.athlete.updateMany({
        where: { id: req.params.id, coachId: req.user!.userId },
        data: { coachNotes: parsed.data.coachNotes },
    });

    if (result.count === 0) {
        res.status(404).json({ error: 'Атлет не найден' });
        return;
    }
    res.json({ ok: true });
});

// GET /athletes/:id — карточка атлета с его тренировками
router.get('/:id', async (req, res) => {
    const athlete = await prisma.athlete.findFirst({
        where: { id: req.params.id, coachId: req.user!.userId },
        select: {
            id: true,
            coachNotes: true,
            user: {
                select: {
                    id: true, lastName: true, firstName: true, middleName: true,
                    phone: true, email: true, active: true,
                },
            },
            workouts: {
                orderBy: { number: 'desc' },
                select: {
                    id: true, number: true, createdAt: true,
                    exercises: {
                        orderBy: { order: 'asc' },
                        select: {
                            id: true, name: true, weight: true, sets: true, reps: true,
                            results: {
                                orderBy: { completedAt: 'desc' },
                                take: 1,
                                select: { status: true },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!athlete) {
        res.status(404).json({ error: 'Атлет не найден' });
        return;
    }
    res.json(athlete);
});

export default router;