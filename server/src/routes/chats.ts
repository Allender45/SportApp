import { Router } from 'express';
import { z } from 'zod';
import { Prisma, type ChatMessage, type User } from '@prisma/client';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireRole('ATHLETE', 'COACH', 'ADMIN'));

const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  middleName: true,
  role: true,
} satisfies Prisma.UserSelect;

type PublicUser = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'middleName' | 'role'
>;

type MessageWithSender = ChatMessage & {
  sender: PublicUser;
};

function serializeUser(user: PublicUser) {
  const name = [user.lastName, user.firstName, user.middleName]
    .filter(Boolean)
    .join(' ');

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName,
    role: user.role,
    name: name || 'Пользователь',
  };
}

function serializeMessage(message: MessageWithSender) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    sender: serializeUser(message.sender),
    content: message.content,
    createdAt: message.createdAt,
    editedAt: message.editedAt,
  };
}

function makeDirectKey(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join(':');
}

/*
 * Создаёт личную беседу или возвращает существующую.
 * directKey защищает от дубликатов.
 */
async function ensureDirectConversation(
  firstUserId: string,
  secondUserId: string,
) {
  const directKey = makeDirectKey(firstUserId, secondUserId);

  return prisma.chatConversation.upsert({
    where: { directKey },
    update: {},
    create: {
      type: 'DIRECT',
      directKey,
      participants: {
        create: [{ userId: firstUserId }, { userId: secondUserId }],
      },
    },
  });
}

/*
 * Если у спортсмена назначен тренер, автоматически создаём
 * их личную беседу.
 */
async function ensureCoachConversation(userId: string) {
  const athlete = await prisma.athlete.findUnique({
    where: { userId },
    select: { coachId: true },
  });

  if (!athlete?.coachId) {
    return null;
  }

  const conversation = await ensureDirectConversation(userId, athlete.coachId);

  return conversation.id;
}

/*
 * Формирует ограничения на список людей, с которыми текущий
 * пользователь может начать переписку.
 */
async function getAccessibleUsersWhere(
  userId: string,
): Promise<Prisma.UserWhereInput> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      athleteProfile: {
        select: { coachId: true },
      },
    },
  });

  if (!currentUser) {
    return { id: '__user_not_found__' };
  }

  const base: Prisma.UserWhereInput = {
    active: true,
    id: { not: userId },
  };

  if (currentUser.role === 'ADMIN') {
    return base;
  }

  if (currentUser.role === 'COACH') {
    return {
      ...base,
      role: 'ATHLETE',
      athleteProfile: {
        coachId: userId,
      },
    };
  }

  const coachId = currentUser.athleteProfile?.coachId;

  return {
    ...base,
    OR: [{ role: 'ATHLETE' }, ...(coachId ? [{ id: coachId }] : [])],
  };
}

async function isParticipant(conversationId: string, userId: string) {
  const participant = await prisma.chatParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  return participant !== null;
}

/*
 * GET /api/chats/users?search=...
 * Список людей для создания личного или группового чата.
 */
router.get('/users', async (req, res) => {
  try {
    const search =
      typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const accessibleUsers = await getAccessibleUsersWhere(req.user!.userId);

    const searchFilter: Prisma.UserWhereInput = search
      ? {
          OR: [
            {
              firstName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              lastName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              phone: {
                contains: search,
              },
            },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where: {
        AND: [accessibleUsers, searchFilter],
      },
      select: publicUserSelect,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 30,
    });

    res.json({
      users: users.map(serializeUser),
    });
  } catch (error) {
    console.error('Ошибка поиска пользователей:', error);
    res.status(500).json({
      error: 'Не удалось получить пользователей',
    });
  }
});

/*
 * GET /api/chats
 * Список бесед текущего пользователя.
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;

    const defaultConversationId = await ensureCoachConversation(userId);

    const participations = await prisma.chatParticipant.findMany({
      where: { userId },
      orderBy: {
        conversation: { updatedAt: 'desc' },
      },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: publicUserSelect,
                },
              },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: publicUserSelect,
                },
              },
            },
          },
        },
      },
    });

    const conversations = await Promise.all(
      participations.map(async participation => {
        const conversation = participation.conversation;
        const lastMessage = conversation.messages[0] ?? null;

        const unreadCount = await prisma.chatMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            deletedAt: null,
            ...(participation.lastReadAt
              ? {
                  createdAt: {
                    gt: participation.lastReadAt,
                  },
                }
              : {}),
          },
        });

        return {
          id: conversation.id,
          type: conversation.type,
          title: conversation.title,
          updatedAt: conversation.updatedAt,
          participants: conversation.participants.map(participant =>
            serializeUser(participant.user),
          ),
          lastMessage: lastMessage ? serializeMessage(lastMessage) : null,
          unreadCount,
        };
      }),
    );

    res.json({
      defaultConversationId,
      conversations,
    });
  } catch (error) {
    console.error('Ошибка загрузки чатов:', error);
    res.status(500).json({
      error: 'Не удалось загрузить чаты',
    });
  }
});

/*
 * POST /api/chats/direct
 * Body: { "userId": "id собеседника" }
 */
router.post('/direct', async (req, res) => {
  const parsed = z
    .object({
      userId: z.string().min(1),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Не указан собеседник',
    });
    return;
  }

  try {
    const currentUserId = req.user!.userId;
    const otherUserId = parsed.data.userId;

    if (otherUserId === currentUserId) {
      res.status(400).json({
        error: 'Нельзя создать чат с самим собой',
      });
      return;
    }

    const accessibleUsers = await getAccessibleUsersWhere(currentUserId);

    const otherUser = await prisma.user.findFirst({
      where: {
        AND: [accessibleUsers, { id: otherUserId }],
      },
      select: { id: true },
    });

    if (!otherUser) {
      res.status(404).json({
        error: 'Пользователь не найден или недоступен',
      });
      return;
    }

    const conversation = await ensureDirectConversation(
      currentUserId,
      otherUser.id,
    );

    res.status(201).json({
      id: conversation.id,
    });
  } catch (error) {
    console.error('Ошибка создания личного чата:', error);
    res.status(500).json({
      error: 'Не удалось создать чат',
    });
  }
});

/*
 * POST /api/chats/group
 * Body: {
 *   "title": "Название",
 *   "participantIds": ["userId1", "userId2"]
 * }
 *
 * Создатель добавляется автоматически, поэтому в participantIds
 * должно быть минимум два других человека.
 */
router.post('/group', async (req, res) => {
  const parsed = z
    .object({
      title: z.string().trim().min(3).max(80),
      participantIds: z.array(z.string().min(1)).min(2).max(20),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Введите название и выберите минимум двух участников',
    });
    return;
  }

  try {
    const currentUserId = req.user!.userId;

    const participantIds = [...new Set(parsed.data.participantIds)].filter(
      id => id !== currentUserId,
    );

    if (participantIds.length < 2) {
      res.status(400).json({
        error: 'В группе должно быть минимум три человека',
      });
      return;
    }

    const accessibleUsers = await getAccessibleUsersWhere(currentUserId);

    const participants = await prisma.user.findMany({
      where: {
        AND: [
          accessibleUsers,
          {
            id: { in: participantIds },
          },
        ],
      },
      select: { id: true },
    });

    if (participants.length !== participantIds.length) {
      res.status(403).json({
        error: 'Некоторые участники недоступны для добавления',
      });
      return;
    }

    const conversation = await prisma.chatConversation.create({
      data: {
        type: 'GROUP',
        title: parsed.data.title,
        createdById: currentUserId,
        participants: {
          create: [currentUserId, ...participantIds].map(userId => ({
            userId,
          })),
        },
      },
    });

    res.status(201).json({
      id: conversation.id,
    });
  } catch (error) {
    console.error('Ошибка создания группового чата:', error);
    res.status(500).json({
      error: 'Не удалось создать групповой чат',
    });
  }
});

/*
 * GET /api/chats/:conversationId/messages
 *
 * Без after возвращает последние 50 сообщений.
 * С after возвращает новые сообщения после указанной даты.
 */
router.get('/:conversationId/messages', async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const userId = req.user!.userId;

    if (!(await isParticipant(conversationId, userId))) {
      res.status(404).json({
        error: 'Чат не найден',
      });
      return;
    }

    let after: Date | null = null;

    if (typeof req.query.after === 'string') {
      after = new Date(req.query.after);

      if (Number.isNaN(after.getTime())) {
        res.status(400).json({
          error: 'Некорректный параметр after',
        });
        return;
      }
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(after
          ? {
              createdAt: { gt: after },
            }
          : {}),
      },
      orderBy: {
        createdAt: after ? 'asc' : 'desc',
      },
      take: after ? 100 : 50,
      include: {
        sender: {
          select: publicUserSelect,
        },
      },
    });

    res.json({
      messages: after
        ? messages.map(serializeMessage)
        : messages.reverse().map(serializeMessage),
    });
  } catch (error) {
    console.error('Ошибка загрузки сообщений:', error);
    res.status(500).json({
      error: 'Не удалось загрузить сообщения',
    });
  }
});

/*
 * POST /api/chats/:conversationId/messages
 * Body: { "content": "Текст сообщения" }
 */
router.post('/:conversationId/messages', async (req, res) => {
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
    const conversationId = req.params.conversationId;
    const userId = req.user!.userId;

    if (!(await isParticipant(conversationId, userId))) {
      res.status(404).json({
        error: 'Чат не найден',
      });
      return;
    }

    const message = await prisma.$transaction(async transaction => {
      const createdMessage = await transaction.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          content: parsed.data.content,
        },
        include: {
          sender: {
            select: publicUserSelect,
          },
        },
      });

      await transaction.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return createdMessage;
    });

    res.status(201).json({
      message: serializeMessage(message),
    });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({
      error: 'Не удалось отправить сообщение',
    });
  }
});

/*
 * POST /api/chats/:conversationId/read
 * Отмечает текущие сообщения прочитанными для этого пользователя.
 */
router.post('/:conversationId/read', async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const userId = req.user!.userId;

    const result = await prisma.chatParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    if (result.count === 0) {
      res.status(404).json({
        error: 'Чат не найден',
      });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Ошибка отметки о прочтении:', error);
    res.status(500).json({
      error: 'Не удалось обновить статус сообщений',
    });
  }
});

export default router;
