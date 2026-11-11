import React, { useEffect, useState, useMemo } from 'react';
import type { HoldResponse } from '../types';
import { api, extractErrorMessage } from '../services/api';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Ban,
  ArrowRight,
  ShieldCheck,
  Hash,
  School
} from 'lucide-react';

interface ActiveHoldProps {
  activeHold: HoldResponse | null;
  onHoldCleared: () => void;
  onHoldConfirmed: () => void;
  onNavigateToClasses: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export const ActiveHold: React.FC<ActiveHoldProps> = ({
  activeHold,
  onHoldCleared,
  onHoldConfirmed,
  onNavigateToClasses,
  onError,
  onSuccess
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>(activeHold?.status || 'HELD');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!activeHold?.expiresAt) return 0;
    const diff = Math.floor((new Date(activeHold.expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });
  const [confirming, setConfirming] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);

  // Sync state whenever activeHold prop changes
  useEffect(() => {
    if (activeHold) {
      setCurrentStatus(activeHold.status);
      const diff = Math.floor((new Date(activeHold.expiresAt).getTime() - Date.now()) / 1000);
      setSecondsRemaining(Math.max(0, diff));
    }
  }, [activeHold]);

  // CRITICAL RULE: Live countdown timer. When 0:00 is reached, WITHOUT page reload,
  // status updates to EXPIRED and the payment button is immediately disabled!
  useEffect(() => {
    if (!activeHold?.expiresAt || currentStatus !== 'HELD') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expiry = new Date(activeHold.expiresAt).getTime();
      const diffSeconds = Math.floor((expiry - now) / 1000);

      if (diffSeconds <= 0) {
        setSecondsRemaining(0);
        setCurrentStatus('EXPIRED');
        clearInterval(interval);
      } else {
        setSecondsRemaining(diffSeconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold?.expiresAt, currentStatus]);

  // Format MM:SS
  const timerDisplay = useMemo(() => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [secondsRemaining]);

  const isExpired = currentStatus === 'EXPIRED' || (currentStatus === 'HELD' && secondsRemaining <= 0);
  const isConfirmed = currentStatus === 'CONFIRMED';
  const isCancelled = currentStatus === 'CANCELLED';

  const handleConfirm = async () => {
    if (!activeHold || isExpired) return;

    setConfirming(true);
    try {
      const result = await api.confirmHold(activeHold.holdId);
      setCurrentStatus('CONFIRMED');
      onSuccess(`ভর্তি সফলভাবে নিশ্চিত হয়েছে! Hold ID: ${result.holdId}`);
      onHoldConfirmed();
    } catch (err) {
      onError(extractErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!activeHold) return;

    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই সংরক্ষিত আসনটি বাতিল করতে চান?')) {
      return;
    }

    setCancelling(true);
    try {
      await api.cancelHold(activeHold.holdId);
      setCurrentStatus('CANCELLED');
      onSuccess('সংরক্ষিত আসন সফলভাবে বাতিল করা হয়েছে।');
      setTimeout(() => {
        onHoldCleared();
      }, 1500);
    } catch (err) {
      onError(extractErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  if (!activeHold) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/90 p-8 text-center shadow-xs">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">বর্তমানে কোনো চলমান আবেদন নেই</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 mb-6">
          "Class তালিকা" ট্যাব থেকে আপনার পছন্দের শ্রেণিতে আবেদন করে আসন সাময়িকভাবে সংরক্ষণ করুন।
        </p>
        <button
          onClick={onNavigateToClasses}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-150"
        >
          <span>Class তালিকা দেখুন</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Main Hold Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        {/* Card Header & Status Banner */}
        <div
          className={`p-6 text-white transition-colors duration-300 ${
            isConfirmed
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
              : isCancelled
              ? 'bg-gradient-to-r from-rose-600 to-pink-600'
              : isExpired
              ? 'bg-gradient-to-r from-slate-600 to-slate-700'
              : 'bg-gradient-to-r from-indigo-600 to-blue-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 opacity-90" />
              <span className="text-xs uppercase font-bold tracking-wider opacity-90">
                চলমান আবেদন ও ফি প্রদান
              </span>
            </div>

            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs ${
                isConfirmed
                  ? 'bg-white text-emerald-700'
                  : isCancelled
                  ? 'bg-white text-rose-700'
                  : isExpired
                  ? 'bg-white text-slate-700'
                  : 'bg-amber-400 text-slate-900 animate-pulse'
              }`}
            >
              {isConfirmed
                ? '✓ CONFIRMED (ভর্তি নিশ্চিত)'
                : isCancelled
                ? '✕ CANCELLED (বাতিল)'
                : isExpired
                ? '✕ EXPIRED (মেয়াদোত্তীর্ণ)'
                : '● HELD (সংরক্ষিত)'}
            </span>
          </div>

          <h2 className="text-2xl font-bold mt-3">
            {isConfirmed
              ? 'অভিনন্দন! আপনার ভর্তি সম্পন্ন হয়েছে'
              : isCancelled
              ? 'আবেদনটি বাতিল করা হয়েছে'
              : isExpired
              ? 'আবেদনের সময়সীমা শেষ হয়ে গেছে'
              : 'আসন সংরক্ষিত আছে — ফি পরিশোধ করুন'}
          </h2>
        </div>

        {/* Details Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Live Countdown Timer Section */}
          <div
            className={`p-5 rounded-2xl border text-center transition-all ${
              isConfirmed
                ? 'bg-emerald-50/70 border-emerald-200'
                : isExpired
                ? 'bg-slate-50 border-slate-200'
                : secondsRemaining < 60
                ? 'bg-rose-50 border-rose-300 text-rose-900 animate-pulse'
                : 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4" />
              <span>
                {isConfirmed
                  ? 'ভর্তি চূড়ান্ত করা হয়েছে'
                  : isExpired
                  ? 'কাউন্টডাউন সমাপ্ত'
                  : 'আসন সংরক্ষণের অবশিষ্ট সময় (Live Timer)'}
              </span>
            </div>

            <div className="font-mono text-4xl sm:text-5xl font-black tracking-tight my-2">
              {isConfirmed ? 'COMPLETED' : timerDisplay}
            </div>

            <p className="text-xs opacity-75">
              {isConfirmed
                ? 'আপনার আসন চূড়ান্তভাবে নিশ্চিত করা হয়েছে।'
                : isExpired
                ? 'নির্ধারিত ১০ মিনিটের সময়সীমা পার হওয়ায় আসনটি মুক্ত হয়ে গেছে।'
                : '১০ মিনিট সময়সীমার মধ্যে ফি পরিশোধ না করলে সিট স্বয়ংক্রিয়ভাবে বাতিল হয়ে যাবে।'}
            </p>
          </div>

          {/* Key Hold Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> Hold ID:
              </span>
              <p className="font-mono font-bold text-slate-800 text-sm mt-1">{activeHold.holdId}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" /> Class ID:
              </span>
              <p className="font-mono font-bold text-slate-800 text-sm mt-1">{activeHold.classId}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium">শিক্ষার্থীর আইডি (Student ID):</span>
              <p className="font-mono font-bold text-slate-800 text-sm mt-1">{activeHold.studentId}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium">মেয়াদ শেষের সময় (Expires At):</span>
              <p className="font-mono font-bold text-slate-800 text-sm mt-1">
                {new Date(activeHold.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {/* Pay / Confirm Button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming || isExpired || isConfirmed || isCancelled}
              className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                isConfirmed
                  ? 'bg-emerald-600 text-white cursor-default shadow-emerald-100'
                  : isExpired || isCancelled
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-200'
              }`}
            >
              {confirming ? (
                <span>ফি প্রসেসিং হচ্ছে...</span>
              ) : isConfirmed ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ভর্তি নিশ্চিত সম্পন্ন</span>
                </>
              ) : isExpired ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>সময় শেষ (বাটন নিষ্ক্রিয়)</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>ভর্তি ফি দিন (Confirm Admission)</span>
                </>
              )}
            </button>

            {/* Cancel Button */}
            {!isConfirmed && !isCancelled && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="py-3 px-5 rounded-xl text-xs font-bold border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {cancelling ? (
                  <span>বাতিল হচ্ছে...</span>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>আবেদন বাতিল</span>
                  </>
                )}
              </button>
            )}

            {/* Back to Classes Button */}
            {(isConfirmed || isCancelled || isExpired) && (
              <button
                type="button"
                onClick={onNavigateToClasses}
                className="py-3 px-5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>অন্যান্য শ্রেণি দেখুন</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
