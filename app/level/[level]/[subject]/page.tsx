import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const LEVEL_MAP: Record<string, { className: string; label: string }> = {
  'ssc-1': { className: 'Class 9', label: 'SSC Part 1' },
  'ssc-2': { className: 'Class 10', label: 'SSC Part 2' },
  'hssc-1': { className: 'Class 11', label: 'HSSC Part 1' },
  'hssc-2': { className: 'Class 12', label: 'HSSC Part 2' },
};

const CATEGORY_LABELS: Record<string, string> = {
  past_paper: 'Past Paper',
  marking_scheme: 'Marking Scheme / Answer Key',
  syllabus: 'Syllabus',
  notes: 'Notes',
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Decides display order within the same year:
// Paper 1, Paper 2, then Marking Scheme, then Notes, then everything else.
function rank(r: { category: string; exam_type: string | null }) {
  if (r.category === 'past_paper' && r.exam_type === 'Paper 1') return 0;
  if (r.category === 'past_paper' && r.exam_type === 'Paper 2') return 1;
  if (r.category === 'past_paper') return 2;
  if (r.category === 'marking_scheme') return 3;
  if (r.category === 'notes') return 4;
  if (r.category === 'syllabus') return 5;
  return 6;
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ level: string; subject: string }>;
}) {
  const { level, subject } = await params;
  const info = LEVEL_MAP[level];

  if (!info) {
    return (
      <main className="min-h-screen bg-[#FAF6EE] flex items-center justify-center px-6">
        <p className="text-[#A02334]">That level doesn&apos;t exist.</p>
      </main>
    );
  }

  const supabase = await createClient();

  const { data: classRow } = await supabase
    .from('classes')
    .select('id')
    .eq('name', info.className)
    .single();

  const { data: allSubjects } = await supabase
    .from('subjects')
    .select('id, name');

  const subjectRow = (allSubjects || []).find(
    (s) => slugify(s.name) === subject
  );

  let resources: any[] = [];

  if (classRow && subjectRow) {
    const { data } = await supabase
      .from('resources')
      .select('id, title, year, category, exam_type, file_url')
      .eq('class_id', classRow.id)
      .eq('subject_id', subjectRow.id);

    resources = (data || []).sort((a, b) => {
      if (b.year !== a.year) return (b.year || 0) - (a.year || 0);
      return rank(a) - rank(b);
    });
  }

  return (
    <main
      className="min-h-screen bg-[#FAF6EE]"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <section className="px-6 py-14 text-white" style={{ backgroundColor: '#1B2A4A' }}>
        <div className="max-w-4xl mx-auto">
          <Link href={`/level/${level}`} className="text-sm text-[#C9CEDE] hover:underline">
            ← Back to {info.label}
          </Link>
          <h1
            className="text-3xl md:text-4xl font-semibold mt-3"
            style={{ fontFamily: "'Source Serif 4', serif" }}
          >
            {subjectRow?.name || 'Subject'}
          </h1>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        {resources.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[#E4DCC8] rounded-lg">
            <p className="text-[#5B6178]">No resources added yet for this subject.</p>
          </div>
        )}

        <div className="space-y-8">
          {Array.from(new Set(resources.map((r) => r.year))).map((year) => (
            <div key={year}>
              <h2 className="text-sm font-semibold tracking-wide text-[#C9A227] uppercase mb-3">
                {year || 'Year not set'}
              </h2>
              <div className="space-y-3">
                {resources
                  .filter((r) => r.year === year)
                  .map((r) => (
                    <a
                      key={r.id}
                      href={r.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between bg-white border border-[#E4DCC8] rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div>
                        <h3 className="font-medium text-[#1B2A4A]">
                          {r.exam_type ? `${r.exam_type} — ` : ''}
                          {CATEGORY_LABELS[r.category] || r.category}
                        </h3>
                        <p className="text-xs text-[#5B6178] mt-0.5">{r.title}</p>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-md text-white bg-[#A02334] whitespace-nowrap ml-4">
                        Download
                      </span>
                    </a>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}