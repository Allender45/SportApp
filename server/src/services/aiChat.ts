import { z } from 'zod';
import { prisma } from '../db';

const API_KEY = process.env.MOONSHOT_API_KEY;
const BASE_URL = (
  process.env.MOONSHOT_BASE_URL ?? 'https://api.moonshot.ai/v1'
).replace(/\/$/, '');
const MODEL = process.env.MOONSHOT_MODEL;

type ToolCall = {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
  reasoning_content?: string;
};

type HistoryMessage = {
  role: 'USER' | 'ASSISTANT';
  content: string;
};

const createWorkoutSchema = z.object({
  title: z.string().trim().max(120).optional(),
  exercises: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        sets: z.number().int().min(1).max(50),
        reps: z.number().int().min(1).max(1000),
        weight: z.number().min(0).max(1000).default(0),
        trainerNote: z.string().trim().max(500).optional(),
      }),
    )
    .min(1)
    .max(30),
});

/*
 * Это описания функций, которые видит нейросеть.
 * Обрати внимание: ни одна функция не принимает athleteId.
 * Спортсмен определяется сервером по авторизованному пользователю.
 */
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_my_workouts',
      description:
        'Получить программу, упражнения и последние результаты текущего спортсмена.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_my_workout',
      description:
        'Добавить новую тренировку текущему спортсмену. ' +
        'Использовать только после явного подтверждения спортсмена.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Название тренировки.',
          },
          exercises: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Название упражнения.',
                },
                sets: {
                  type: 'integer',
                  minimum: 1,
                  description: 'Количество подходов.',
                },
                reps: {
                  type: 'integer',
                  minimum: 1,
                  description: 'Количество повторений.',
                },
                weight: {
                  type: 'number',
                  minimum: 0,
                  description: 'Рабочий вес в килограммах.',
                },
                trainerNote: {
                  type: 'string',
                  description: 'Необязательный комментарий к упражнению.',
                },
              },
              required: ['name', 'sets', 'reps'],
            },
          },
        },
        required: ['exercises'],
      },
    },
  },
  {
    type: 'builtin_function',
    function: {
      name: '$web_search',
    },
  },
];

async function callMoonshot(
  messages: ChatMessage[],
  withTools: boolean,
): Promise<ChatMessage> {
  if (!API_KEY || !MODEL) {
    throw new Error('Не заданы MOONSHOT_API_KEY или MOONSHOT_MODEL');
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: withTools ? tools : undefined,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Moonshot API вернул ${response.status}: ${responseText.slice(0, 500)}`,
    );
  }

  const data = JSON.parse(responseText) as {
    choices?: Array<{
      message?: ChatMessage;
    }>;
  };

  const message = data.choices?.[0]?.message;

  if (!message) {
    throw new Error('Moonshot API не вернул сообщение');
  }

  return message;
}

async function getMyWorkouts(athleteId: string) {
  const workouts = await prisma.workout.findMany({
    where: { athleteId },
    orderBy: { number: 'desc' },
    take: 20,
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: {
          results: {
            orderBy: { completedAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  return workouts.reverse().map(workout => ({
    id: workout.id,
    number: workout.number,
    title: workout.title,
    exercises: workout.exercises.map(exercise => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      trainerNote: exercise.trainerNote,
      lastResult: exercise.results[0]
        ? {
            status: exercise.results[0].status,
            athleteComment: exercise.results[0].athleteComment,
            completedAt: exercise.results[0].completedAt,
          }
        : null,
    })),
  }));
}

async function createMyWorkout(athleteId: string, rawArguments: unknown) {
  const input = createWorkoutSchema.parse(rawArguments);

  return prisma.$transaction(async transaction => {
    const max = await transaction.workout.aggregate({
      where: { athleteId },
      _max: { number: true },
    });

    const workout = await transaction.workout.create({
      data: {
        athleteId,
        number: (max._max.number ?? 0) + 1,
        title: input.title || null,
        exercises: {
          create: input.exercises.map((exercise, index) => ({
            order: index + 1,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            trainerNote: exercise.trainerNote,
          })),
        },
      },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
        },
      },
    });

    await Promise.all(
      input.exercises.map(exercise =>
        transaction.exerciseTemplate.upsert({
          where: { name: exercise.name },
          update: {},
          create: { name: exercise.name },
        }),
      ),
    );

    return {
      id: workout.id,
      number: workout.number,
      title: workout.title,
      exercises: workout.exercises,
    };
  });
}

async function executeAthleteTool(
  name: string,
  args: unknown,
  athleteId: string,
) {
  switch (name) {
    case 'get_my_workouts':
      return getMyWorkouts(athleteId);

    case 'create_my_workout':
      return createMyWorkout(athleteId, args);

    default:
      throw new Error(`Неизвестная функция: ${name}`);
  }
}

export async function generateAthleteReply(params: {
  athleteId: string;
  athleteName: string;
  summary: string;
  history: HistoryMessage[];
}): Promise<string> {
  const { athleteId, athleteName, summary, history } = params;

  const systemPrompt = `
Ты — ИИ-помощник спортсмена в приложении SportApp.

Отвечай на русском языке, понятно и по существу.
Имя текущего спортсмена: ${athleteName}.

Ты можешь:
- объяснять технику упражнений;
- давать общие рекомендации по тренировкам и питанию;
- анализировать программу и результаты текущего спортсмена;
- составлять и добавлять новые тренировки;
- искать актуальную информацию в интернете.

Правила:
1. Не выдумывай программу или результаты спортсмена.
   Для их получения используй get_my_workouts.
2. Перед create_my_workout сначала покажи спортсмену
   предлагаемую тренировку и получи явное подтверждение.
3. Никогда не утверждай, что тренировка добавлена,
   пока create_my_workout не вернул её данные.
4. При вопросах о боли, травмах или заболеваниях
   рекомендуй обратиться к врачу.
5. Советы по питанию давай как общие рекомендации,
   а не как медицинское назначение.
6. Используй $web_search, когда нужна актуальная
   или недостающая тебе информация.

Саммари предыдущего общения:
${summary || 'Предыдущего контекста пока нет.'}
`.trim();

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...history.map(message => ({
      role:
        message.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: message.content,
    })),
  ];

  /*
   * Модель может сделать несколько обращений к функциям:
   * например, сначала посмотреть программу, затем найти
   * информацию в интернете и только потом ответить.
   */
  for (let step = 0; step < 8; step += 1) {
    const assistantMessage = await callMoonshot(messages, true);
    messages.push(assistantMessage);

    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage.content ?? 'Не удалось сформировать ответ.';
    }

    for (const toolCall of assistantMessage.tool_calls) {
      let result: unknown;

      try {
        const args = toolCall.function.arguments
          ? JSON.parse(toolCall.function.arguments)
          : {};

        if (toolCall.function.name === '$web_search') {
          /*
           * Для встроенного поиска Moonshot аргументы
           * возвращаются обратно без собственной обработки.
           */
          result = args;
        } else {
          result = await executeAthleteTool(
            toolCall.function.name,
            args,
            athleteId,
          );
        }
      } catch (error) {
        result = {
          error:
            error instanceof Error
              ? error.message
              : 'Ошибка выполнения функции',
        };
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error('Превышено допустимое количество вызовов инструментов');
}

export async function updateConversationSummary(params: {
  previousSummary: string;
  userMessage: string;
  assistantMessage: string;
}): Promise<string> {
  const { previousSummary, userMessage, assistantMessage } = params;

  const message = await callMoonshot(
    [
      {
        role: 'system',
        content: `
Обнови краткое саммари диалога спортсмена с ИИ.

Сохрани только полезный долговременный контекст:
- цели и ограничения спортсмена;
- предпочтения;
- важные сведения о тренировках и питании;
- принятые решения;
- созданные тренировки.

Не переписывай диалог дословно.
Не добавляй выдуманные сведения.
Ответ должен содержать только саммари, не более 200 слов.
`.trim(),
      },
      {
        role: 'user',
        content: `
Предыдущее саммари:
${previousSummary || 'Пусто'}

Новое сообщение спортсмена:
${userMessage}

Ответ ассистента:
${assistantMessage}
`.trim(),
      },
    ],
    false,
  );

  return message.content?.trim() || previousSummary;
}
