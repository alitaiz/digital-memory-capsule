
import React, { createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { useMemories } from './hooks/useMemorials';
import { Memory, CreatedMemoryInfo, MemoryUpdatePayload, MemorySummary } from './types';
import StartPage from './pages/StartPage';
import CreatePage from './pages/CreatePage';
import MemoryPage from './pages/MemoryPage';
import ListPage from './pages/ListPage';
import RecoverPage from './pages/RecoverPage';
import { GiftIcon } from './components/ui';


interface MemoriesContextType {
  loading: boolean;
  addMemory: (memoryData: { title: string; shortMessage: string; memoryContent: string; images: string[]; avatarUrl?: string | null, coverImageUrl?: string | null }) => Promise<{ success: boolean; error?: string; slug?: string }>;
  getMemoryBySlug: (slug: string) => Promise<Omit<Memory, 'editKey'> | undefined>;
  getMemorySummaries: (slugs: string[]) => Promise<MemorySummary[]>;
  deleteMemory: (slug: string, editKey: string) => Promise<{ success: boolean; error?: string }>;
  updateMemory: (slug: string, editKey: string, data: MemoryUpdatePayload) => Promise<{ success: boolean; error?: string; }>;
  getAllSlugs: () => string[];
  getCreatedMemories: () => CreatedMemoryInfo[];
  removeVisitedSlug: (slug: string) => void;
}

const MemoriesContext = createContext<MemoriesContextType | undefined>(undefined);

export const useMemoriesContext = () => {
  const context = useContext(MemoriesContext);
  if (!context) {
    throw new Error('useMemoriesContext must be used within a MemoriesProvider');
  }
  return context;
};

const MemoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const memoriesData = useMemories();
  return (
    <MemoriesContext.Provider value={memoriesData}>
      {children}
    </MemoriesContext.Provider>
  );
};

const Header = () => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHomePage ? 'bg-transparent' : 'bg-white/50 backdrop-blur-sm shadow-sm'}`}>
            <nav className="container mx-auto px-6 py-3 flex justify-center items-center">
                <Link to="/" className="flex items-center space-x-3 text-slate-700 group">
                    <GiftIcon className="w-6 h-6 text-sky-500 transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-serif text-xl font-bold group-hover:text-sky-600 transition-colors">Digital Memories</span>
                    <GiftIcon className="w-6 h-6 text-sky-500 transition-transform duration-300 group-hover:scale-110" />
                </Link>
            </nav>
        </header>
    );
};

const AppLayout: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow">
                <Outlet />
            </main>
            <footer className="text-center py-4 text-slate-500 text-sm">
                <p>Crafted with joy to celebrate our shared moments. ✨</p>
            </footer>
        </div>
    );
};

const NotFoundPage = () => (
    <div className="min-h-screen flex items-center justify-center text-center px-4 pt-20">
        <div>
            <h1 className="text-4xl font-bold font-serif text-slate-700">404 - Page Not Found</h1>
            <p className="mt-4 text-lg text-slate-600">The page you are looking for does not exist.</p>
            <Link to="/" className="mt-8 inline-block bg-sky-500 text-white font-bold py-2 px-4 rounded-full hover:bg-sky-600 transition-colors duration-300">
                Return Home
            </Link>
        </div>
    </div>
);

function App() {
  return (
    <MemoriesProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<StartPage />} />
            <Route path="create" element={<CreatePage />} />
            <Route path="edit/:slug" element={<CreatePage />} />
            <Route path="memory/:slug" element={<MemoryPage />} />
            <Route path="list" element={<ListPage />} />
            <Route path="recover" element={<RecoverPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MemoriesProvider>
  );
}

export default App;
