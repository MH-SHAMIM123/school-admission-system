import React from 'react';
import { School, CheckCircle2, AlertTriangle, User, Eraser } from 'lucide-react';

interface HeaderProps {
  studentId: string;
  onStudentIdChange: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ studentId, onStudentIdChange }) => {
  const is17Digits = /^\d{17}$/.test(studentId.trim());
  const hasInput = studentId.trim().length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // allow only numbers up to 17 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 17);
    onStudentIdChange(cleaned);
  };

  const handleClear = () => {
    onStudentIdChange('');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & System Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-150">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                স্কুল ভর্তি ব্যবস্থা
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Online Admission & Seat Hold System
              </p>
            </div>
          </div>

          {/* Student ID Header Input & Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 whitespace-nowrap">
              <User className="w-4 h-4 text-indigo-600" />
              <span>জন্ম নিবন্ধন নম্বর (X-Student-Id):</span>
            </div>

            <div className="relative flex items-center w-full sm:w-auto">
              <input
                type="text"
                value={studentId}
                onChange={handleChange}
                placeholder="১৭ ডিজিটের নম্বর দিন..."
                maxLength={17}
                className="w-full sm:w-60 px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 shadow-2xs pr-14"
              />
              <span className="absolute right-2 text-[10px] font-mono text-slate-400 select-none">
                {studentId.length}/17
              </span>
            </div>

            {/* Validation Badge */}
            <div className="flex items-center gap-2">
              {is17Digits ? (
                <span data-testid="student-id-badge-valid" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  আইডি সক্রিয়
                </span>
              ) : hasInput ? (
                <span data-testid="student-id-badge-invalid" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  ১৭ ডিজিট প্রয়োজন
                </span>
              ) : (
                <span data-testid="student-id-badge-empty" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                  আইডি খালি
                </span>
              )}

              {hasInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 transition-colors"
                  title="ক্লিয়ার করুন"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
