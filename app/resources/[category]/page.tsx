import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

// Maps the URL slug (what's in the address bar) to the value
// stored in the database's `category` column.
const CATEGORY_MAP: Record<string, { db: string; label: string; accent: string }> = {
  'past-papers': { db: 'past_paper', label: 'Past Papers', accent: '#A02334' },
  'marking-schemes': { db: 'marking_scheme', label: 'Marking Schemes', accent: '#2F6F6F' },
  'syllabus': { db: 'syllabus', label: 'Syllabus', accent: '#C9A227' },
  'notes': { db: 'notes', label: 'Notes', accent: '#3D4F91' },
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const info = CATEGORY_MAP[category];

  if (!info) {
    return (
      <main className="min-h-screen bg-[#FAF6EE] flex items-center justify-center px-6">
        <p className="text-[#A02334]">That category doesn&apos;t exist.</p>
      </main>
    );
  }

  const supabase = await createClient();

  const { data: resources, error } = await supabase
    .from('resources')
    .select(
      `
      id,
      title,
      year,
      exam_type,
      file_url,
      subjects ( name ),
      classes ( name ),
      boards ( name )
    `
    )
    .eq('category', info.db)
    .order('year', { ascending: false });

  return (
    <main
      className="min-h-screen bg-[#FAF6EE]"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header banner */}
      <section
        className="px-6 py-14 text-white"
        style={{ backgroundColor: '#1B2A4A' }}
      >
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
        </div>
      </section>

      {/* Resource list */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        {error && (
          <p className="text-[#A02334]">
            Something went wrong loading resources.
          </p>
        )}

        {!error && (!resources || resources.length === 0) && (
          <div className="text-center py-16 border border-dashed border-[#E4DCC8] rounded-lg">
            <p className="text-[#5B6178]">
              No {info.label.toLowerCase()} added yet. Check back soon.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {resources?.map((r: any) => (
            <a
              key={r.id}
              href={r.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-white border border-[#E4DCC8] rounded-lg p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div>
                <h3
                  className="font-semibold text-[#1B2A4A] mb-1"
                  style={{ fontFamily: "'Source Serif 4', serif" }}
                >
                  {r.title}
                </h3>
                <p className="text-sm text-[#5B6178]">
                  {[r.classes?.name, r.subjects?.name, r.boards?.name, r.exam_type, r.year]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-md text-white whitespace-nowrap ml-4"
                style={{ backgroundColor: info.accent }}
              >
                Download
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}