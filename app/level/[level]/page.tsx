import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const LEVEL_MAP: Record<string, { className: string; label: string; sub: string }> = {
  'ssc-1': { className: 'Class 9', label: 'SSC Part 1', sub: 'Class 9' },
  'ssc-2': { className: 'Class 10', label: 'SSC Part 2', sub: 'Class 10' },
  'hssc-1': { className: 'Class 11', label: 'HSSC Part 1', sub: 'Class 11' },
  'hssc-2': { className: 'Class 12', label: 'HSSC Part 2', sub: 'Class 12' },
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default async function LevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
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

  let subjectList: { id: number; name: string }[] = [];

  if (classRow) {
    const { data: resources } = await supabase
      .from('resources')
      .select('subject_id, subjects ( id, name )')
      .eq('class_id', classRow.id);

    const seen = new Map<number, string>();
    (resources || []).forEach((r: any) => {
      if (r.subjects) seen.set(r.subjects.id, r.subjects.name);
    });

    subjectList = Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <main
      className="min-h-screen bg-[#FAF6EE]"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <section className="px-6 py-14 text-white" style={{ backgroundColor: '#1B2A4A' }}>
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-sm text-[#C9CEDE] hover:underline">
            ← Back home
          </Link>
          <h1
            className="text-3xl md:text-4xl font-semibold mt-3"
            style={{ fontFamily: "'Source Serif 4', serif" }}
          >
            {info.label}
          </h1>
          <p className="text-[#C9CEDE] mt-1">{info.sub}</p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        {subjectList.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[#E4DCC8] rounded-lg">
            <p className="text-[#5B6178]">No subjects added yet for {info.sub}.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {subjectList.map((s) => (
            <Link
              key={s.id}
              href={`/level/${level}/${slugify(s.name)}`}
              className="bg-white border border-[#E4DCC8] rounded-lg p-5 hover:shadow-md hover:-translate-y-0.5 transition-all block text-center"
            >
              <h3
                className="font-semibold text-[#1B2A4A]"
                style={{ fontFamily: "'Source Serif 4', serif" }}
              >
                {s.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}