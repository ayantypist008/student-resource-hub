'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Option = { id: number; name: string };

export default function AdminUploadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [boards, setBoards] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('past_paper');
  const [boardId, setBoardId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState('');
  const [examType, setExamType] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'admin');
      setChecking(false);
    }

    checkAdmin();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    async function loadOptions() {
      const [boardsRes, classesRes, subjectsRes] = await Promise.all([
        supabase.from('boards').select('id, name').order('name'),
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
      ]);

      setBoards(boardsRes.data || []);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
    }

    loadOptions();
  }, [isAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setError('Please choose a PDF file to upload.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const fileExt = file.name.split('.').pop();
    const safeName = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 50);
    const filePath = `${category}/${safeName}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(filePath, file);

    if (uploadError) {
      setSubmitting(false);
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('resources').getPublicUrl(filePath);

    const { error: insertError } = await supabase.from('resources').insert({
      title,
      category,
      board_id: boardId ? Number(boardId) : null,
      class_id: classId ? Number(classId) : null,
      subject_id: subjectId ? Number(subjectId) : null,
      year: year ? Number(year) : null,
      exam_type: examType || null,
      file_url: publicUrl,
      uploaded_by: user?.id,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess(true);
    setTitle('');
    setYear('');
    setExamType('');
    setFile(null);
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-[#FAF6EE] flex items-center justify-center">
        <p className="text-[#5B6178]">Checking access...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#FAF6EE] flex items-center justify-center px-6">
        <p className="text-[#A02334] font-medium">
          You don&apos;t have access to this page.
        </p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#FAF6EE] px-6 py-16"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="max-w-lg mx-auto">
        <h1
          className="text-3xl font-semibold text-[#1B2A4A] mb-8"
          style={{ fontFamily: "'Source Serif 4', serif" }}
        >
          Add a resource
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E4DCC8] rounded-lg p-6 space-y-4 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Class 12 Physics 2025 Final Paper"
              className="w-full border border-[#E4DCC8] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-[#E4DCC8] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
            >
              <option value="past_paper">Past Paper</option>
              <option value="marking_scheme">Marking Scheme</option>
              <option value="syllabus">Syllabus</option>
              <option value="notes">Notes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1">
              Paper (optional)
            </label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full border border-[#E4DCC8] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
            >
              <option value="">Not applicable</option>
              <option value="Paper 1">Paper 1</option>
              <option value="Paper 2">Paper 2</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-1">
                Board
              </label>
              <select
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="w-full border border-[#E4DCC8] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
              >
                <option value="">Select</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-1">
                Class
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full border border-[#E4DCC8] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
              >
                <option value="">Select</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-1">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full border border-[#E4DCC8] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
              >
                <option value="">Select</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-1">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2025"
                className="w-full border border-[#E4DCC8] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1">
              PDF file
            </label>
            <input
              type="file"
              accept="application/pdf"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border border-[#E4DCC8] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#1B2A4A] file:text-white"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && (
            <p className="text-green-700 text-sm">Resource added!</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#A02334] text-white rounded-md py-2 font-medium hover:bg-[#87182a] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Uploading...' : 'Add resource'}
          </button>
        </form>
      </div>
    </main>
  );
}