'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Option = { id: number; name: string };

type Row = {
  file: File;
  path: string;
  title: string;
  category: string;
  classId: string;
  subjectId: string;
  boardId: string;
  year: string;
  examType: string;
  className: string;
  subjectName: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
};

const LEVEL_FOLDER_MAP: Record<string, string> = {
  'ssc-i': 'Class 9',
  'ssc-ii': 'Class 10',
  'hssc-i': 'Class 11',
  'hssc-ii': 'Class 12',
};

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

function subjectFolderToName(folder: string): string {
  let base = folder.replace(/_(English|Urdu)$/i, '').replace(/_/g, ' ').trim();
  if (/islamiat/i.test(base)) return 'Islamiat';
  if (/pakistan/i.test(base)) return 'Pakistan Studies';
  if (/computer/i.test(base)) return 'Computer Science';
  return base;
}

function findLevelAndSubject(segments: string[]): { className: string; subjectFolder: string } {
  // segments = every folder name in the path, EXCLUDING the filename.
  // Search every position for SSC-I/SSC-II/HSSC-I/HSSC-II - this works
  // whether the user selected the root folder or a level folder directly.
  for (let i = 0; i < segments.length; i++) {
    const norm = segments[i].toLowerCase();
    if (LEVEL_FOLDER_MAP[norm]) {
      return {
        className: LEVEL_FOLDER_MAP[norm],
        subjectFolder: segments[i + 1] || '',
      };
    }
  }
  return { className: '', subjectFolder: segments[0] || '' };
}

function parseFile(file: File) {
  const parts = (file as any).webkitRelativePath.split('/');
  const segments = parts.slice(0, parts.length - 1);
  const { className, subjectFolder } = findLevelAndSubject(segments);
  const filename = parts[parts.length - 1];
  const nameOnly = filename.replace(/\.pdf$/i, '');
  const lower = nameOnly.toLowerCase();

  const yearMatch = nameOnly.match(/(19|20)\d{2}/);
  const year = yearMatch ? yearMatch[0] : '';

  let category = 'past_paper';
  if (/key|answer|marking/.test(lower)) category = 'marking_scheme';
  else if (/syllabus/.test(lower)) category = 'syllabus';
  else if (/\bnotes?\b/.test(lower)) category = 'notes';

  let examType = '';
  const paperMatch = nameOnly.match(/paper[\s-]*([IVXLivxl]+)/i);
  if (paperMatch) {
    const num = romanToNumber(paperMatch[1].toUpperCase());
    if (num) examType = `Paper ${num}`;
  }

  return {
    path: (file as any).webkitRelativePath,
    title: nameOnly.replace(/[-_]+/g, ' ').trim(),
    className,
    subjectName: subjectFolderToName(subjectFolder),
    year,
    category,
    examType,
  };
}

export default function FolderUploadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [boards, setBoards] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);

  const [rows, setRows] = useState<Row[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

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

  function handleFolderSelected(fileList: FileList | null) {
    if (!fileList) return;

    const defaultBoardId = boards[0]?.id ? String(boards[0].id) : '';

    const pdfFiles = Array.from(fileList).filter((f) =>
      f.name.toLowerCase().endsWith('.pdf')
    );

    const newRows: Row[] = pdfFiles.map((file) => {
      const parsed = parseFile(file);

      const matchedClass = classes.find((c) => c.name === parsed.className);
      const matchedSubject = subjects.find(
        (s) => s.name.toLowerCase() === parsed.subjectName.toLowerCase()
      );

      return {
        file,
        path: parsed.path,
        title: parsed.title,
        category: parsed.category,
        classId: matchedClass ? String(matchedClass.id) : '',
        subjectId: matchedSubject ? String(matchedSubject.id) : '',
        boardId: defaultBoardId,
        year: parsed.year,
        examType: parsed.examType,
        className: parsed.className,
        subjectName: parsed.subjectName,
        status: 'pending',
      };
    });

    function paperRank(r: Row): number {
      if (r.category === 'past_paper') {
        if (r.examType === 'Paper 1') return 0;
        if (r.examType === 'Paper 2') return 1;
        return 2;
      }
      if (r.category === 'marking_scheme') return 3;
      if (r.category === 'notes') return 4;
      if (r.category === 'syllabus') return 5;
      return 6;
    }

    function yearNum(y: string): number {
      const n = parseInt(y, 10);
      return Number.isNaN(n) ? 0 : n;
    }

    const sorted = [...newRows].sort((a, b) => {
      if (a.subjectName !== b.subjectName) {
        return a.subjectName.localeCompare(b.subjectName);
      }
      const yearDiff = yearNum(b.year) - yearNum(a.year);
      if (yearDiff !== 0) return yearDiff;
      return paperRank(a) - paperRank(b);
    });

    setRows(sorted);
  }

  function updateRow(index: number, changes: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...changes } : r))
    );
  }

  async function handleUploadAll() {
    setUploading(true);
    setUploadedCount(0);

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
        setUploadedCount((c) => c + 1);
      }
    }

    setUploading(false);
  }

  const unmatchedCount = rows.filter((r) => !r.classId || !r.subjectId).length;

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
          Folder upload
        </h1>
        <p className="text-sm text-[#5B6178] mb-8">
          Select a folder (either the root AKUEB_Papers folder, or a single
          level like HSSC-I). Class and subject are detected automatically —
          just check year and paper number.
        </p>

        <div className="bg-white border border-[#E4DCC8] rounded-lg p-6 mb-6">
          <input
            type="file"
            // @ts-ignore - non-standard attributes for folder selection
            webkitdirectory=""
            directory=""
            multiple
            onChange={(e) => handleFolderSelected(e.target.files)}
            className="file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#1B2A4A] file:text-white"
          />
        </div>

        {rows.length > 0 && (
          <>
            <p className="text-sm mb-4">
              <span className="font-semibold">{rows.length}</span> PDFs found.
              {unmatchedCount > 0 && (
                <span className="text-[#A02334] ml-2">
                  {unmatchedCount} row(s) missing class/subject — fix those
                  before uploading.
                </span>
              )}
            </p>

            <div className="overflow-x-auto bg-white border border-[#E4DCC8] rounded-lg max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-[#E4DCC8] text-left text-[#5B6178]">
                    <th className="p-3">Path</th>
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
                    <tr
                      key={i}
                      className={`border-b border-[#F0EBDB] ${
                        !row.classId || !row.subjectId ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="p-3 text-xs text-[#5B6178] max-w-[200px] truncate" title={row.path}>
                        {row.path}
                      </td>
                      <td className="p-3">
                        <input
                          value={row.title}
                          onChange={(e) => updateRow(i, { title: e.target.value })}
                          className="w-full border border-[#E4DCC8] rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={row.category}
                          onChange={(e) => updateRow(i, { category: e.target.value })}
                          className="border border-[#E4DCC8] rounded px-2 py-1"
                        >
                          <option value="past_paper">Past Paper</option>
                          <option value="marking_scheme">Marking Scheme</option>
                          <option value="syllabus">Syllabus</option>
                          <option value="notes">Notes</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={row.classId}
                          onChange={(e) => updateRow(i, { classId: e.target.value })}
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
                          onChange={(e) => updateRow(i, { subjectId: e.target.value })}
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
                          onChange={(e) => updateRow(i, { examType: e.target.value })}
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
                          onChange={(e) => updateRow(i, { year: e.target.value })}
                          className="w-16 border border-[#E4DCC8] rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-3 text-xs">
                        {row.status === 'pending' && <span className="text-[#5B6178]">Ready</span>}
                        {row.status === 'uploading' && <span className="text-[#C9A227]">Uploading...</span>}
                        {row.status === 'done' && <span className="text-green-700">Done</span>}
                        {row.status === 'error' && (
                          <span className="text-[#A02334]" title={row.errorMsg}>Error</span>
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
                ? `Uploading... (${uploadedCount}/${rows.length})`
                : `Upload all ${rows.length} files`}
            </button>
          </>
        )}
      </div>
    </main>
  );
}