import { Router } from 'express';
import { z } from 'zod';
import { AiMessageRole, type AiMessage } from '@prisma/client';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  generateAthleteReply,
  updateConversationSummary,
} from '../services/aiChat';

const router = Router();

/*
 * Все маршруты этого файла доступны только авторизованному
 * спортсмену.
 */
router.use(requireAuth, requireRole('ATHLETE'));

function serializeMessage(message: AiMessage) {
  return {
    id: message.id,
    role: message.role === AiMessageRole.USER ? 'user' : 'assistant',
    content: message.content,
    createdAt: message.createdAt,
  };
}

async function findAthlete(userId: string) {
  return prisma.athlete.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

/*
 * GET /api/my/ai-chat
 * Возвращает последние 100 сообщений текущего спортсмена.
 */
router.get('/', async (req, res) => {
  try {
    const athlete = await findAthlete(req.user!.userId);

    if (!athlete) {
      res.status(404).json({
        error: 'Профиль спортсмена не найден',
      });
      return;
    }

    const conversation = await prisma.aiConversation.findUnique({
      where: { athleteId: athlete.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    const messages = conversation?.messages ?? [];

    res.json({
      messages: messages.reverse().map(serializeMessage),
    });
  } catch (error) {
    console.error('Ошибка загрузки ИИ-чата:', error);
    res.status(500).json({
      error: 'Не удалось загрузить чат',
    });
  }
});

/*
 * POST /api/my/ai-chat
 * Body: { "content": "Вопрос спортсмена" }
 */
router.post('/', async (req, res) => {
  const parsed = z
    .object({
      content: z.string().trim().min(1).max(4000),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Введите сообщение длиной до 4000 символов',
    });
    return;
  }

  try {
    const athlete = await findAthlete(req.user!.userId);

    if (!athlete) {
      res.status(404).json({
        error: 'Профиль спортсмена не найден',
      });
      return;
    }

    const conversation = await prisma.aiConversation.upsert({
      where: { athleteId: athlete.id },
      update: {},
      create: { athleteId: athlete.id },
    });

    const userMessage = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiMessageRole.USER,
        content: parsed.data.content,
      },
    });

    /*
     * Берём небольшую часть последних сообщений.
     * Более старый контекст передаётся через саммари.
     */
    const recentMessages = await prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 21,
    });

    const athleteName =
      [athlete.user.firstName, athlete.user.lastName]
        .filter(Boolean)
        .join(' ') || 'Спортсмен';

    const reply = await generateAthleteReply({
      athleteId: athlete.id,
      athleteName,
      summary: conversation.summary,
      history: recentMessages.reverse().map(message => ({
        role: message.role,
        content: message.content,
      })),
    });

    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiMessageRole.ASSISTANT,
        content: reply,
      },
    });

    /*
     * Ошибка создания саммари не должна уничтожать
     * уже полученный ответ нейросети.
     */
    try {
      const summary = await updateConversationSummary({
        previousSummary: conversation.summary,
        userMessage: userMessage.content,
        assistantMessage: reply,
      });

      await prisma.aiConversation.update({
        where: { id: conversation.id },
        data: { summary },
      });
    } catch (summaryError) {
      console.error('Не удалось обновить саммари:', summaryError);
    }

    res.status(201).json({
      message: serializeMessage(assistantMessage),
    });
  } catch (error) {
    console.error('Ошибка обработки сообщения ИИ:', error);
    res.status(502).json({
      error: 'Не удалось получить ответ нейросети',
    });
  }
});

export default router;
