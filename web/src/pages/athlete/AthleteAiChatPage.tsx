import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import { api } from '@/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export default function AthleteAiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<{ messages: ChatMessage[] }>('/my/ai-chat')
      .then(response => {
        if (!cancelled) {
          setMessages(response.data.messages);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Не удалось загрузить историю чата');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, sending]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();

    const content = input.trim();

    if (!content || sending) {
      return;
    }

    /*
     * Сразу показываем сообщение пользователя,
     * не дожидаясь ответа сервера.
     */
    const localMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages(previous => [...previous, localMessage]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const response = await api.post<{
        message: ChatMessage;
      }>('/my/ai-chat', { content });

      setMessages(previous => [...previous, response.data.message]);
    } catch {
      /*
       * Если запрос не выполнился, убираем локальное
       * сообщение и возвращаем текст в поле ввода.
       */
      setMessages(previous =>
        previous.filter(message => message.id !== localMessage.id),
      );
      setInput(content);
      setError(
        'Не удалось получить ответ. Проверь сервер и настройки Moonshot API.',
      );
    } finally {
      setSending(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    /*
     * Enter отправляет сообщение.
     * Shift + Enter добавляет новую строку.
     */
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <section className="mx-auto flex h-[calc(100dvh-170px)] min-h-[480px] w-full max-w-4xl flex-col px-4 py-4 lg:px-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
          <Bot size={24} />
        </div>

        <div>
          <h1 className="font-display text-lg text-ink">Спроси ИИ</h1>
          <p className="text-xs text-dim">
            Тренировки, упражнения, питание и твоя программа
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-panel/80">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center text-dim">
              <Loader2 className="animate-spin" size={26} />
            </div>
          ) : (
            <div className="space-y-5">
              {messages.length === 0 && (
                <div className="mx-auto max-w-md py-12 text-center">
                  <Bot className="mx-auto mb-4 text-cyan" size={38} />

                  <h2 className="mb-2 font-semibold text-ink">
                    Чем могу помочь?
                  </h2>

                  <p className="text-sm leading-6 text-dim">
                    Можешь спросить о технике упражнения, попросить
                    проанализировать свою программу или составить новую
                    тренировку.
                  </p>
                </div>
              )}

              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan/20 bg-cyan/10 text-cyan">
                      <Bot size={17} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-cyan text-night'
                        : 'rounded-bl-md border border-line bg-card text-ink'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/20 bg-cyan/10 text-cyan">
                    <Bot size={17} />
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-line bg-card px-4 py-3 text-sm text-dim">
                    <Loader2 className="animate-spin" size={16} />
                    ИИ формирует ответ…
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-line bg-panel p-3 sm:p-4">
          {error && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={sendMessage} className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Задай вопрос…"
              rows={1}
              maxLength={4000}
              disabled={sending}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-night px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-dim focus:border-cyan/60 disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Отправить сообщение"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan text-night transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={19} />
              ) : (
                <Send size={19} />
              )}
            </button>
          </form>

          <p className="mt-2 text-center text-[11px] text-dim">
            Enter — отправить, Shift + Enter — новая строка. ИИ может ошибаться.
          </p>
        </div>
      </div>
    </section>
  );
}
