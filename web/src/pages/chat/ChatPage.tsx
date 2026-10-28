import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  UsersRound,
} from 'lucide-react';
import { api } from '@/api';
import { useAuth } from '@/auth/authCore';
import NewChatModal, { type ChatUser } from './NewChatModal';

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  sender: ChatUser;
  content: string;
  createdAt: string;
  editedAt: string | null;
};

type Conversation = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  title: string | null;
  updatedAt: string;
  participants: ChatUser[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
};

type ConversationsResponse = {
  defaultConversationId: string | null;
  conversations: Conversation[];
};

export default function ChatPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const response = await api.get<ConversationsResponse>('/chats');

      const nextConversations = response.data.conversations;

      setConversations(nextConversations);
      setError(null);

      setSelectedId(currentId => {
        const currentStillExists = nextConversations.some(
          conversation => conversation.id === currentId,
        );

        if (currentId && currentStillExists) {
          return currentId;
        }

        /*
         * Автоматический выбор выполняем только при
         * первоначальной загрузке страницы.
         */
        if (!initializedRef.current) {
          initializedRef.current = true;

          return (
            response.data.defaultConversationId ??
            nextConversations[0]?.id ??
            null
          );
        }

        return null;
      });
    } catch {
      setError('Не удалось загрузить список чатов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();

    const interval = window.setInterval(() => {
      void loadConversations();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let active = true;
    let requestRunning = false;

    const loadMessages = async (initial: boolean) => {
      if (requestRunning) {
        return;
      }

      requestRunning = true;

      if (initial) {
        setMessagesLoading(true);
      }

      try {
        const response = await api.get<{
          messages: ChatMessage[];
        }>(`/chats/${selectedId}/messages`);

        if (!active) {
          return;
        }

        setMessages(response.data.messages);
        setError(null);

        /*
         * Пока беседа открыта, считаем входящие
         * сообщения прочитанными.
         */
        void api.post(`/chats/${selectedId}/read`).catch(() => undefined);
      } catch {
        if (active && initial) {
          setError('Не удалось загрузить сообщения');
        }
      } finally {
        requestRunning = false;

        if (active && initial) {
          setMessagesLoading(false);
        }
      }
    };

    void loadMessages(true);

    const interval = window.setInterval(() => {
      void loadMessages(false);
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages.length, sending, selectedId]);

  const selectedConversation = useMemo(
    () =>
      conversations.find(conversation => conversation.id === selectedId) ??
      null,
    [conversations, selectedId],
  );

  const conversationName = useCallback(
    (conversation: Conversation) => {
      if (conversation.type === 'GROUP') {
        return conversation.title || 'Групповой чат';
      }

      const otherParticipant = conversation.participants.find(
        participant => participant.id !== user?.id,
      );

      return otherParticipant?.name ?? 'Личный чат';
    },
    [user?.id],
  );

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();

    const content = input.trim();

    if (!content || !selectedId || sending) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await api.post<{
        message: ChatMessage;
      }>(`/chats/${selectedId}/messages`, { content });

      setInput('');

      setMessages(previous => {
        const alreadyExists = previous.some(
          message => message.id === response.data.message.id,
        );

        return alreadyExists ? previous : [...previous, response.data.message];
      });

      void loadConversations();
    } catch {
      setError('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleCreated = async (conversationId: string) => {
    setNewChatOpen(false);
    await loadConversations();
    setSelectedId(conversationId);
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <section className="mx-auto h-[calc(100dvh-170px)] min-h-[480px] w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6">
      <div className="flex h-full overflow-hidden rounded-2xl border border-line bg-panel/85">
        <aside
          className={`w-full flex-col border-r border-line lg:flex lg:w-80 lg:shrink-0 ${
            selectedId ? 'hidden' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between border-b border-line p-4">
            <div>
              <h1 className="font-display text-lg text-ink">Чаты</h1>
              <p className="mt-1 text-xs text-dim">Личные и групповые беседы</p>
            </div>

            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan text-night transition hover:brightness-110"
              aria-label="Создать чат"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex h-full items-center justify-center text-dim">
                <Loader2 className="animate-spin" size={25} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-dim">
                Чатов пока нет.
                <br />
                Нажми «+», чтобы начать общение.
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map(conversation => {
                  const lastMessage = conversation.lastMessage;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                        selectedId === conversation.id
                          ? 'border-cyan/30 bg-cyan/10'
                          : 'border-transparent hover:bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                          {conversationName(conversation)}
                        </div>

                        {conversation.unreadCount > 0 && (
                          <span className="flex min-w-5 items-center justify-center rounded-full bg-cyan px-1.5 py-0.5 text-[10px] font-bold text-night">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 truncate text-xs text-dim">
                        {conversation.type === 'GROUP'
                          ? `${conversation.participants.length} участника · `
                          : ''}

                        {lastMessage
                          ? lastMessage.content
                          : 'Сообщений пока нет'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div
          className={`min-w-0 flex-1 flex-col lg:flex ${
            selectedId ? 'flex' : 'hidden'
          }`}
        >
          {selectedConversation ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-4">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="text-dim hover:text-ink lg:hidden"
                  aria-label="Вернуться к списку чатов"
                >
                  <ArrowLeft size={21} />
                </button>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
                  {selectedConversation.type === 'GROUP' ? (
                    <UsersRound size={20} />
                  ) : (
                    <MessageCircle size={20} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {conversationName(selectedConversation)}
                  </div>

                  <div className="text-xs text-dim">
                    {selectedConversation.type === 'GROUP'
                      ? `${selectedConversation.participants.length} участника`
                      : 'Личная беседа'}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center text-dim">
                    <Loader2 className="animate-spin" size={26} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-dim">
                    Сообщений пока нет.
                    <br />
                    Напиши первое сообщение.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(message => {
                      const own = message.senderId === user?.id;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            own ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[70%] ${
                              own
                                ? 'rounded-br-md bg-cyan text-night'
                                : 'rounded-bl-md border border-line bg-card text-ink'
                            }`}
                          >
                            {!own && selectedConversation.type === 'GROUP' && (
                              <div className="mb-1 text-xs font-medium text-cyan">
                                {message.sender.name}
                              </div>
                            )}

                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.content}
                            </p>

                            <div
                              className={`mt-1 text-right text-[10px] ${
                                own ? 'text-night/60' : 'text-dim'
                              }`}
                            >
                              {formatTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-line p-3 sm:p-4">
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
                    placeholder="Сообщение…"
                    rows={1}
                    maxLength={4000}
                    disabled={sending}
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-night px-4 py-3 text-sm text-ink outline-none placeholder:text-dim focus:border-cyan/60 disabled:opacity-60"
                  />

                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan text-night transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Отправить сообщение"
                  >
                    {sending ? (
                      <Loader2 className="animate-spin" size={19} />
                    ) : (
                      <Send size={19} />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-dim">
              Выбери беседу или создай новую
            </div>
          )}
        </div>
      </div>

      {newChatOpen && (
        <NewChatModal
          onClose={() => setNewChatOpen(false)}
          onCreated={conversationId => {
            void handleCreated(conversationId);
          }}
        />
      )}
    </section>
  );
}
