import React, { useEffect, useState, useCallback } from 'react';
import type { StudentHoldSummary, HoldResponse } from '../types';
import { api, extractErrorMessage } from '../services/api';
import {
  FileText,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  UserCheck
} from 'lucide-react';

interface MyHoldsProps {
  studentId: string;
  onSelectHold: (hold: HoldResponse) => void;
  onError: (msg: string) => void;
}

export const MyHolds: React.FC<MyHoldsProps> = ({ studentId, onSelectHold, onError }) => {
  const [holds, setHolds] = useState<StudentHoldSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const isStudentIdValid = /^\d{17}$/.test(studentId.trim());

  const fetchMyHolds = useCallback(async () => {
    if (!isStudentIdValid) {
      setLoading(false);
      setHolds([]);
      return;
    }

    setLoading(true);
    try {
      const data = await api.getMyHolds();
      setHolds(data);
    } catch (err) {
      onError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isStudentIdValid, onError]);

  useEffect(() => {
    fetchMyHolds();
  }, [fetchMyHolds]);

  if (!isStudentIdValid) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/90 p-8 text-center shadow-xs">
        <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">জন্ম নিবন্ধন নম্বর প্রদান করুন</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          আপনার আবেদনের ইতিহাস ও ভর্তির স্ট্যাটাস দেখতে উপরে ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর লিখুন।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">আমার সকল আবেদন (My Applications)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            শিক্ষার্থী আইডি: <span className="font-mono font-semibold text-slate-700">{studentId}</span>
          </p>
        </div>

        <button
          onClick={fetchMyHolds}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          রিফ্রেশ
        </button>
      </div>

      {/* Holds List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">আবেদনের তথ্য লোড হচ্ছে...</p>
        </div>
      ) : holds.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-200/80">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">কোনো আবেদন পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 mt-1">
            আপনি এই আইডি দিয়ে এখনো কোনো শ্রেণিতে সিট সংরক্ষণ বা আবেদন করেননি।
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">শ্রেণির নাম</th>
                  <th className="px-5 py-3.5">Hold ID</th>
                  <th className="px-5 py-3.5">স্ট্যাটাস (Status)</th>
                  <th className="px-5 py-3.5">মেয়াদোত্তীর্ণের সময় (Expires At)</th>
                  <th className="px-5 py-3.5 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {holds.map((h) => {
                  const isHeld = h.status === 'HELD';
                  const isConfirmed = h.status === 'CONFIRMED';
                  const isExpired = h.status === 'EXPIRED';

                  return (
                    <tr key={h.holdId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {h.className || h.classId}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-500 text-[11px]">
                        {h.holdId}
                      </td>
                      <td className="px-5 py-4">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            CONFIRMED (ভর্তি নিশ্চিত)
                          </span>
                        ) : isHeld ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            HELD (চলমান)
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                            EXPIRED (মেয়াদ শেষ)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            CANCELLED (বাতিল)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600 text-[11px]">
                        {new Date(h.expiresAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isHeld && (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectHold({
                                holdId: h.holdId,
                                classId: h.classId,
                                studentId,
                                status: h.status,
                                expiresAt: h.expiresAt
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                          >
                            <span>ফি দিন</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
