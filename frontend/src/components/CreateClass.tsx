import React, { useState } from 'react';
import { api, extractErrorMessage } from '../services/api';
import { PlusCircle, School, Users, CheckCircle2, ArrowRight } from 'lucide-react';

interface CreateClassProps {
  onClassCreated: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export const CreateClass: React.FC<CreateClassProps> = ({ onClassCreated, onError, onSuccess }) => {
  const [name, setName] = useState<string>('');
  const [totalSeats, setTotalSeats] = useState<number | ''>(30);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      onError('শ্রেণির নাম অবশ্যই দিতে হবে।');
      return;
    }

    const seats = Number(totalSeats);
    if (!seats || seats <= 0) {
      onError('আসন সংখ্যা অবশ্যই ০-এর বেশি হতে হবে।');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createClass({
        name: name.trim(),
        totalSeats: seats
      });

      onSuccess(`সফল হয়েছে! "${created.name}" শ্রেণি ${created.totalSeats}টি আসন সহ তৈরি হয়েছে।`);
      setName('');
      setTotalSeats(30);
      onClassCreated();
    } catch (err) {
      onError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">নতুন শ্রেণি তৈরি করুন (Admin)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ভর্তি প্রক্রিয়ার জন্য নতুন শ্রেণি এবং মোট আসন সংখ্যা নির্ধারণ করুন।
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Class Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              শ্রেণির নাম (Class Name) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <School className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: Class 6 - Morning Shift"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              শ্রেণি ও শিফটের নাম পরিষ্কারভাবে উল্লেখ করুন।
            </p>
          </div>

          {/* Total Seats */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              মোট আসন সংখ্যা (Total Seats) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Users className="w-4 h-4" />
              </div>
              <input
                type="number"
                required
                min={1}
                max={1000}
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="যেমন: ৫০"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              এই শ্রেণিতে সর্বোচ্চ কতজন শিক্ষার্থী ভর্তি হতে পারবে।
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting || !name.trim() || !totalSeats}
              className="w-full py-3 px-6 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white transition-all shadow-md shadow-indigo-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span>তৈরি করা হচ্ছে...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>শ্রেণি তৈরি সম্পন্ন করুন</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
