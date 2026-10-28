import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Search, UsersRound, X } from 'lucide-react';
import { api } from '@/api';
import { Modal } from '@/components';

export type ChatUser = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  role: 'ATHLETE' | 'COACH' | 'ADMIN';
};

type Props = {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
};

export default function NewChatModal({ onClose, onCreated }: Props) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      setLoading(true);

      api
        .get<{ users: ChatUser[] }>('/chats/users', {
          params: { search },
        })
        .then(response => {
          if (!cancelled) {
            setUsers(response.data.users);
            setError(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError('Не удалось загрузить пользователей');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search]);

  const toggleUser = (userId: string) => {
    setSelectedIds(previous =>
      previous.includes(userId)
        ? previous.filter(id => id !== userId)
        : [...previous, userId],
    );
  };

  const createChat = async (event: FormEvent) => {
    event.preventDefault();

    if (selectedIds.length === 0 || creating) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response =
        selectedIds.length === 1
          ? await api.post<{ id: string }>('/chats/direct', {
              userId: selectedIds[0],
            })
          : await api.post<{ id: string }>('/chats/group', {
              title: groupTitle,
              participantIds: selectedIds,
            });

      onCreated(response.data.id);
    } catch {
      setError('Не удалось создать чат');
    } finally {
      setCreating(false);
    }
  };

  const isGroup = selectedIds.length >= 2;

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-lg">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Новый чат</h2>
          <p className="mt-1 text-sm text-dim">
            Выбери одного человека для личного чата или нескольких для
            группового.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-dim transition-colors hover:text-ink"
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={createChat}>
        <label className="relative block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dim"
            size={18}
          />

          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Поиск по имени или телефону"
            className="w-full rounded-xl border border-line bg-night py-3 pl-10 pr-4 text-sm text-ink outline-none placeholder:text-dim focus:border-cyan/60"
          />
        </label>

        <div className="mt-4 max-h-72 min-h-40 overflow-y-auto rounded-xl border border-line bg-night/40 p-2">
          {loading ? (
            <div className="flex h-36 items-center justify-center text-dim">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : users.length === 0 ? (
            <div className="flex h-36 items-center justify-center text-center text-sm text-dim">
              Пользователи не найдены
            </div>
          ) : (
            <div className="space-y-1">
              {users.map(user => {
                const selected = selectedIds.includes(user.id);

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUser(user.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-cyan/40 bg-cyan/10'
                        : 'border-transparent hover:bg-card'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-dim">
                      <UsersRound size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-ink">
                        {user.name}
                      </div>
                      <div className="text-xs text-dim">
                        {user.role === 'COACH'
                          ? 'Тренер'
                          : user.role === 'ATHLETE'
                          ? 'Спортсмен'
                          : 'Администратор'}
                      </div>
                    </div>

                    <div
                      className={`h-4 w-4 rounded border ${
                        selected ? 'border-cyan bg-cyan' : 'border-line'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {isGroup && (
          <input
            value={groupTitle}
            onChange={event => setGroupTitle(event.target.value)}
            placeholder="Название группового чата"
            minLength={3}
            maxLength={80}
            required
            className="mt-4 w-full rounded-xl border border-line bg-night px-4 py-3 text-sm text-ink outline-none placeholder:text-dim focus:border-cyan/60"
          />
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            creating ||
            selectedIds.length === 0 ||
            (isGroup && groupTitle.trim().length < 3)
          }
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-3 text-sm font-semibold text-night transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating && <Loader2 className="animate-spin" size={17} />}

          {isGroup ? 'Создать групповой чат' : 'Открыть личный чат'}
        </button>
      </form>
    </Modal>
  );
}
