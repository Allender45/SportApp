import {useEffect, useState} from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    Dumbbell, History, CalendarDays, BarChart3, MessageCircle, Newspaper,
    Users, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../auth/authCore.ts';

const athleteMenu = [
    { to: '/my', label: 'Программа', icon: Dumbbell },
    { to: '/my/history', label: 'История', icon: History },
    { to: '/my/upcoming', label: 'Будущие', icon: CalendarDays },
    { to: '/my/stats', label: 'Статистика', icon: BarChart3 },
    { to: '/my/chat', label: 'Чат с тренером', icon: MessageCircle },
    { to: '/my/news', label: 'Новости', icon: Newspaper },
];

const coachMenu = [
    { to: '/coach', label: 'Атлеты', icon: Users },
    { to: '/coach/stats', label: 'Статистика', icon: BarChart3 },
    { to: '/coach/news', label: 'Новости', icon: Newspaper },
    { to: '/coach/exercises', label: 'Упражнения', icon: Dumbbell },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const menu = user?.role === 'ATHLETE' ? athleteMenu : coachMenu;

    const navItem = (to: string, label: string, Icon: typeof Dumbbell) => (
        <NavLink
            key={to}
            to={to}
            end={to === '/my' || to === '/coach'}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                 ${isActive
                    ? 'bg-cyan/10 text-cyan border border-cyan/30'
                    : 'text-dim hover:text-ink hover:bg-card border border-transparent'}`
            }
        >
            <Icon size={18} />
            {label}
        </NavLink>
    );

    return (
        <div className="min-h-screen bg-night text-ink flex
                        bg-[url('/images/main_bg.png')] bg-cover bg-center bg-no-repeat
                        lg:bg-none">
            {/* Сайдбар — только на lg+ */}
            <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-line bg-panel sticky top-0 h-screen">
                <div className="px-6 py-5 border-b border-line">
                    <span className="text-cyan text-xs font-bold tracking-[0.25em]">SPORT</span>
                    <span className="text-ink text-xs font-bold tracking-[0.25em]">APP</span>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menu.map(item => navItem(item.to, item.label, item.icon))}
                </nav>
                <div className="p-4 border-t border-line">
                    <div className="text-sm font-semibold"></div>
                    <div className="text-dim text-xs mb-3">{user?.email}</div>
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        className="flex items-center gap-2 text-dim hover:text-ember text-sm transition-colors"
                    >
                        <LogOut size={16} /> Выйти
                    </button>
                </div>
            </aside>

            {/* Правая колонка: шапка + контент + футер */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="sticky top-0 z-20 flex items-center gap-4 px-4 lg:px-8 py-3.5
                                   border-b border-line bg-night/85 backdrop-blur">
                    <button
                        className="lg:hidden text-dim hover:text-ink"
                        onClick={() => setMenuOpen(true)}
                        aria-label="Меню"
                    >
                        <Menu size={22} />
                    </button>
                    <div className="lg:hidden">
                        <span className="text-cyan text-x font-bold tracking-[0.25em]">SPORT</span>
                        <span className="text-ink text-x font-bold tracking-[0.25em]">APP</span>
                    </div>
                    <div className="ml-auto text-right">
                        <div className="text-xl font-semibold leading-tight tabular-nums">
                            {now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-dim text-[12px]">
                            {now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
                        </div>
                    </div>
                </header>

                <main className="flex-1">
                    <Outlet />
                </main>

                <footer className="border-t border-line px-4 lg:px-8 py-4 flex flex-wrap gap-x-6 gap-y-1
                                   text-dim text-xs">
                    <span>© 2026 SportApp</span>
                    <span>{user?.role === 'ATHLETE' ? 'Вопросы — тренеру в чат' : 'Панель тренера'}</span>
                </footer>
            </div>

            {/* Мобильное меню — выезжающая панель */}
            {menuOpen && (
                <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMenuOpen(false)}>
                    <div className="absolute inset-0 bg-black/70" />
                    <div
                        className="absolute left-0 top-0 bottom-0 w-72 bg-panel border-r border-line p-4 flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-2 pb-4 border-b border-line mb-3">
                            <div>
                                <span className="text-cyan text-xs font-bold tracking-[0.25em]">SPORT</span>
                                <span className="text-ink text-xs font-bold tracking-[0.25em]">APP</span>
                            </div>
                            <button onClick={() => setMenuOpen(false)} className="text-dim" aria-label="Закрыть">
                                <X size={20} />
                            </button>
                        </div>
                        <nav className="flex-1 space-y-1">
                            {menu.map(item => navItem(item.to, item.label, item.icon))}
                        </nav>
                        <button
                            onClick={() => { logout(); navigate('/login'); }}
                            className="flex items-center gap-2 text-dim hover:text-ember text-sm px-4 py-2"
                        >
                            <LogOut size={16} /> Выйти
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}