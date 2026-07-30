'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Option = { id: number; name: string };

type Row = {
  file: File;
  title: string;
  category: string;
  classId: string;
  subjectId: string;
  boardId: string;
  year: string;
  examType: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
};

// Converts a Roman numeral like "XII" into a plain number, e.g. 12.
// Only needs to handle the small range used for class levels (I - XII).
function romanToNumber(roman: string): number | null {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  let total = 0;
  let prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const value = map[roman[i]];
    if (!value) return null;
    if (value < prev) total -= value;
    else total += value;
    prev = value;
  }
  return total;
}

// Reads a filename like "Mathematics-XII-Paper-II-2025.pdf" and pulls out
// the subject, class, paper number, year, and likely category.
function parseFilename(filename: string) {
  const nameOnly = filename.replace(/\.pdf$/i, '');
  const lower = nameOnly.toLowerCase();

  // Year: first 4-digit number found
  const yearMatch = nameOnly.match(/(19|20)\d{2}/);
  const year = yearMatch ? yearMatch[0] : '';

  // Category guess, based on keywords anywhere in the filename
  let category = 'past_paper';
  if (/marking|answer|scheme/.test(lower)) category = 'marking_scheme';
  else if (/syllabus/.test(lower)) category = 'syllabus';
  else if (/notes?/.test(lower)) category = 'notes';

  // All standalone Roman numeral "words" in the filename, in order
  const romanWords = nameOnly.match(/\b[IVXLivxl]+\b/g) || [];

  // First Roman numeral = class level (e.g. XII -> 12)
  let classNumber: number | null = null;
  if (romanWords.length > 0) {
    classNumber = romanToNumber(romanWords[0].toUpperCase());
  }

  // If "Paper" appears, the Roman numeral right after it is the paper number
  let examType = '';
  const paperMatch = nameOnly.match(/paper[\s-]*([IVXLivxl]+)/i);
  if (paperMatch) {
    const num = romanToNumber(paperMatch[1].toUpperCase());
    if (num) examType = `Paper ${num}`;
  }

  // Subject = everything before the first Roman numeral / number
  const subjectMatch = nameOnly.match(/^([A-Za-z ]+)/);
  const subjectGuess = subjectMatch
    ? subjectMatch[1].replace(/[-_]+$/, '').trim()
    : '';

  return {
    title: nameOnly.replace(/[-_]+/g, ' ').trim(),
    category,
    classNumber,
    subjectGuess,
    year,
    examType,
  };
}

export default function BulkUploadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [boards, setBoards] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);

  const [rows, setRows] = useState<Row[]>([]);
  const [uploading, setUploading] = useState(false);

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

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;

    const defaultBoardId = boards[0]?.id ? String(boards[0].id) : '';

    const newRows: Row[] = Array.from(fileList).map((file) => {
      const parsed = parseFilename(file.name);

      // Try to match the guessed class number to a real class row
      const matchedClass = classes.find((c) =>
        c.name.includes(String(parsed.classNumber))
      );

      // Try to match the guessed subject text to a real subject row
      const matchedSubject = subjects.find((s) =>
        s.name.toLowerCase().includes(parsed.subjectGuess.toLowerCase()) ||
        parsed.subjectGuess.toLowerCase().includes(s.name.toLowerCase())
      );

      return {
        file,
        title: parsed.title,
        category: parsed.category,
        classId: matchedClass ? String(matchedClass.id) : '',
        subjectId: matchedSubject ? String(matchedSubject.id) : '',
        boardId: defaultBoardId,
        year: parsed.year,
        examType: parsed.examType,
        status: 'pending',
      };
    });

    setRows(newRows);
  }

  function updateRow(index: number, changes: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...changes } : r))
    );
  }

  async function handleUploadAll() {
    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      updateRow(i, { status: 'uploading' });

      const fileExt = row.file.name.split('.').pop();
      const safeName = row.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50);
      const filePath = `${row.category}/${safeName}-${Date.now()}-${i}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, row.file);

      if (uploadError) {
        updateRow(i, { status: 'error', errorMsg: uploadError.message });
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('resources').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('resources').insert({
        title: row.title,
        category: row.category,
        board_id: row.boardId ? Number(row.boardId) : null,
        class_id: row.classId ? Number(row.classId) : null,
        subject_id: row.subjectId ? Number(row.subjectId) : null,
        year: row.year ? Number(row.year) : null,
        exam_type: row.examType || null,
        file_url: publicUrl,
        uploaded_by: user?.id,
      });

      if (insertError) {
        updateRow(i, { status: 'error', errorMsg: insertError.message });
      } else {
        updateRow(i, { status: 'done' });
      }
    }

    setUploading(false);
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
      <div className="max-w-6xl mx-auto">
        <h1
          className="text-3xl font-semibold text-[#1B2A4A] mb-2"
          style={{ fontFamily: "'Source Serif 4', serif" }}
        >
          Bulk upload
        </h1>
        <p className="text-sm text-[#5B6178] mb-8">
          Select multiple PDFs at once. We&apos;ll guess the details from each
          filename — check them before uploading.
        </p>

        <div className="bg-white border border-[#E4DCC8] rounded-lg p-6 mb-6">
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#1B2A4A] file:text-white"
          />
        </div>

        {rows.length > 0 && (
          <>
            <div className="overflow-x-auto bg-white border border-[#E4DCC8] rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E4DCC8] text-left text-[#5B6178]">
                    <th className="p-3">File</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Paper</th>
                    <th className="p-3">Year</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-[#F0EBDB]">
                      <td className="p-3 text-xs text-[#5B6178] max-w-[160px] truncate">
                        {row.file.name}
                      </td>
                      <td className="p-3">
                        <input
                          value={row.title}
                          onChange={(e) =>
                            updateRow(i, { title: e.target.value })
                          }
                          className="w-full border border-[#E4DCC8] rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={row.category}
                          onChange={(e) =>
                            updateRow(i, { category: e.target.value })
                          }
                          className="border border-[#E4DCC8] rounded px-2 py-1"
                        >
                          <option value="past_paper">Past Paper</option>
                          <option value="marking_scheme">
                            Marking Scheme
                          </option>
                          <option value="syllabus">Syllabus</option>
                          <option value="notes">Notes</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={row.classId}
                          onChange={(e) =>
                            updateRow(i, { classId: e.target.value })
                          }
                          className="border border-[#E4DCC8] rounded px-2 py-1"
                        >
                          <option value="">-</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={row.subjectId}
                          onChange={(e) =>
                            updateRow(i, { subjectId: e.target.value })
                          }
                          className="border border-[#E4DCC8] rounded px-2 py-1"
                        >
                          <option value="">-</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={row.examType}
                          onChange={(e) =>
                            updateRow(i, { examType: e.target.value })
                          }
                          className="border border-[#E4DCC8] rounded px-2 py-1"
                        >
                          <option value="">-</option>
                          <option value="Paper 1">Paper 1</option>
                          <option value="Paper 2">Paper 2</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          value={row.year}
                          onChange={(e) =>
                            updateRow(i, { year: e.target.value })
                          }
                          className="w-16 border border-[#E4DCC8] rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-3 text-xs">
                        {row.status === 'pending' && (
                          <span className="text-[#5B6178]">Ready</span>
                        )}
                        {row.status === 'uploading' && (
                          <span className="text-[#C9A227]">Uploading...</span>
                        )}
                        {row.status === 'done' && (
                          <span className="text-green-700">Done</span>
                        )}
                        {row.status === 'error' && (
                          <span className="text-[#A02334]" title={row.errorMsg}>
                            Error
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleUploadAll}
              disabled={uploading}
              className="mt-6 bg-[#A02334] text-white px-6 py-3 rounded-md font-medium hover:bg-[#87182a] transition-colors disabled:opacity-50"
            >
              {uploading
                ? 'Uploading...'
                : `Upload all ${rows.length} files`}
            </button>
          </>
        )}
      </div>
    </main>
  );
}