import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ClassList } from './components/ClassList';
import { CreateClass } from './components/CreateClass';
import { ActiveHold } from './components/ActiveHold';
import { MyHolds } from './components/MyHolds';
import { NotificationBanner } from './components/NotificationBanner';
import type { HoldResponse } from './types';
import { School, PlusCircle, Clock, FileText } from 'lucide-react';

type Tab = 'classes' | 'create' | 'active' | 'my-holds';

export const App: React.FC = () => {
  // Student ID state with localStorage persistence
  const [studentId, setStudentId] = useState<string>(() => {
    return localStorage.getItem('studentId') || '';
  });

  // Active Hold state with localStorage persistence
  const [activeHold, setActiveHold] = useState<HoldResponse | null>(() => {
    try {
      const saved = localStorage.getItem('activeHold');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<Tab>('classes');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync studentId to localStorage
  const handleStudentIdChange = (id: string) => {
    setStudentId(id);
    localStorage.setItem('studentId', id);
  };

  // Sync activeHold to localStorage
  useEffect(() => {
    if (activeHold) {
      localStorage.setItem('activeHold', JSON.stringify(activeHold));
    } else {
      localStorage.removeItem('activeHold');
    }
  }, [activeHold]);

  const handleHoldSuccess = (hold: HoldResponse) => {
    setActiveHold(hold);
    setActiveTab('active');
  };

  const handleHoldConfirmed = () => {
    if (activeHold) {
      setActiveHold({ ...activeHold, status: 'CONFIRMED' });
    }
  };

  const handleHoldCleared = () => {
    setActiveHold(null);
    setActiveTab('classes');
  };

  const handleError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
  };

  const handleSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Global Header with Student ID Input & Validation Badge */}
      <Header studentId={studentId} onStudentIdChange={handleStudentIdChange} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast / Notification Banners */}
        {errorMessage && (
          <NotificationBanner
            type="error"
            message={errorMessage}
            onClose={() => setErrorMessage(null)}
          />
        )}
        {successMessage && (
          <NotificationBanner
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
          />
        )}

        {/* Tab Navigation Navigation Bar */}
        <div className="flex border-b border-slate-200/90 mb-6 gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('classes')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Class তালিকা</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Class তৈরি (Admin)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all relative ${
              activeTab === 'active'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>চলমান আবেদন ও ফি</span>
            {activeHold && activeHold.status === 'HELD' && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-2 right-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my-holds')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'my-holds'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>আমার আবেদন</span>
          </button>
        </div>

        {/* View Routing */}
        <div className="transition-opacity duration-200">
          {activeTab === 'classes' && (
            <ClassList
              studentId={studentId}
              onHoldSuccess={handleHoldSuccess}
              onError={handleError}
              onSuccess={handleSuccess}
            />
          )}

          {activeTab === 'create' && (
            <CreateClass
              onClassCreated={() => setActiveTab('classes')}
              onError={handleError}
              onSuccess={handleSuccess}
            />
          )}

          {activeTab === 'active' && (
            <ActiveHold
              activeHold={activeHold}
              onHoldCleared={handleHoldCleared}
              onHoldConfirmed={handleHoldConfirmed}
              onNavigateToClasses={() => setActiveTab('classes')}
              onError={handleError}
              onSuccess={handleSuccess}
            />
          )}

          {activeTab === 'my-holds' && (
            <MyHolds
              studentId={studentId}
              onSelectHold={(h) => {
                setActiveHold(h);
                setActiveTab('active');
              }}
              onError={handleError}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          স্কুল ভর্তি ও আসন সংরক্ষণ সিস্টেম &copy; {new Date().getFullYear()} — Pessimistic Concurrency & Live Expiration Engine
        </div>
      </footer>
    </div>
  );
};

export default App;
