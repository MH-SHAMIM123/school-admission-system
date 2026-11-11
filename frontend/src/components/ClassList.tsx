import React, { useEffect, useState, useCallback } from 'react';
import type { SchoolClass, HoldResponse } from '../types';
import { api, extractErrorMessage } from '../services/api';
import { RefreshCw, Users, Clock, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';

interface ClassListProps {
  studentId: string;
  onHoldSuccess: (hold: HoldResponse) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export const ClassList: React.FC<ClassListProps> = ({
  studentId,
  onHoldSuccess,
  onError,
  onSuccess
}) => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [holdingClassId, setHoldingClassId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const isStudentIdValid = /^\d{17}$/.test(studentId.trim());

  const fetchClasses = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsPolling(true);

    try {
      const data = await api.getClasses();
      setClasses(data);
      setLastRefreshed(new Date());
    } catch (err) {
      if (!isSilent) {
        onError(extractErrorMessage(err));
      }
    } finally {
      setLoading(false);
      setIsPolling(false);
    }
  }, [onError]);

  // Initial fetch and auto-polling every 3.5 seconds
  useEffect(() => {
    fetchClasses(false);

    const interval = setInterval(() => {
      fetchClasses(true);
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchClasses]);

  const handleApplyHold = async (classItem: SchoolClass) => {
    if (!isStudentIdValid) {
      onError('আবেদন করার পূর্বে উপরে আপনার ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর লিখুন।');
      return;
    }

    if (classItem.availableSeats <= 0) {
      onError('দুঃখিত, এই ক্লাসে কোনো সিট খালি নেই।');
      return;
    }

    setHoldingClassId(classItem.id);
    try {
      const hold = await api.createHold(classItem.id);
      onSuccess(`অভিনন্দন! ${classItem.name} ক্লাসে সিট সফলভাবে সংরক্ষিত (HELD) হয়েছে। অনুগ্রহ করে সময়সীমার মধ্যে ফি প্রদান করুন।`);
      onHoldSuccess(hold);
      await fetchClasses(true);
    } catch (err) {
      onError(extractErrorMessage(err));
    } finally {
      setHoldingClassId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">শ্রেণিভিত্তিক আসন তালিকা (Class List)</h2>
            {isPolling && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="Auto-updating..." />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            প্রতি ৩.৫ সেকেন্ড পর পর লাইভ আসন সংখ্যা স্বয়ংক্রিয়ভাবে আপডেট হচ্ছে।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            সর্বশেষ আপডেট: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={() => fetchClasses(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      {loading && classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">শ্রেণি তালিকা লোড হচ্ছে...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-200/80">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <SchoolClassIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">কোনো শ্রেণি পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 mt-1">
            "Class তৈরি" ট্যাব থেকে নতুন শ্রেণি যুক্ত করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((c) => {
            const isFull = c.availableSeats <= 0;
            const isHolding = holdingClassId === c.id;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border p-5.5 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                  isFull ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200/90 hover:border-indigo-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600">
                        {c.name}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">ID: {c.id}</span>
                    </div>

                    {isFull ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200 flex-shrink-0">
                        সিট নেই
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
                        সিট খালি
                      </span>
                    )}
                  </div>

                  {/* Seat Stats Card Grid */}
                  <div className="grid grid-cols-2 gap-2.5 my-4">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                        <Users className="w-3.5 h-3.5" />
                        <span>মোট আসন</span>
                      </div>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">{c.totalSeats}</p>
                    </div>

                    <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>খালি আসন</span>
                      </div>
                      <p className="text-lg font-bold text-emerald-800 mt-0.5">{c.availableSeats}</p>
                    </div>

                    <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-1.5 text-amber-700 text-[11px] font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>রিজার্ভড (Held)</span>
                      </div>
                      <p className="text-lg font-bold text-amber-800 mt-0.5">{c.heldSeats}</p>
                    </div>

                    <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-1.5 text-blue-700 text-[11px] font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>ভর্তি নিশ্চিত</span>
                      </div>
                      <p className="text-lg font-bold text-blue-800 mt-0.5">{c.confirmedSeats}</p>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="space-y-1 mb-5">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(c.confirmedSeats / c.totalSeats) * 100}%` }}
                        className="bg-blue-500 transition-all duration-300"
                        title={`ভর্তি: ${c.confirmedSeats}`}
                      />
                      <div
                        style={{ width: `${(c.heldSeats / c.totalSeats) * 100}%` }}
                        className="bg-amber-400 transition-all duration-300"
                        title={`রিজার্ভড: ${c.heldSeats}`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>আসন পূর্ণ: {c.confirmedSeats + c.heldSeats}/{c.totalSeats}</span>
                      <span>খালি: {c.availableSeats}</span>
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={() => handleApplyHold(c)}
                  disabled={isFull || isHolding || !isStudentIdValid}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-xs ${
                    isFull
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : !isStudentIdValid
                      ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-98 shadow-indigo-150'
                  }`}
                  title={
                    !isStudentIdValid
                      ? 'আবেদন করতে উপরে ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর দিন'
                      : isFull
                      ? 'সিট খালি নেই'
                      : 'সিট রিজার্ভ করতে ক্লিক করুন'
                  }
                >
                  {isHolding ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>প্রসেসিং হচ্ছে...</span>
                    </>
                  ) : isFull ? (
                    'কোনো সিট খালি নেই'
                  ) : (
                    'আবেদন করুন (Hold Seat)'
                  )}
                </button>

                {!isStudentIdValid && !isFull && (
                  <p className="text-[10px] text-amber-600 text-center mt-2 flex items-center justify-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    আবেদন করতে উপরে ১৭ ডিজিটের আইডি দিন
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function SchoolClassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}
