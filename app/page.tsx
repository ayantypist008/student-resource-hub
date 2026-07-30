import Link from "next/link";

const levels = [
  {
    href: "/level/ssc-1",
    label: "SSC Part 1",
    sub: "Class 9",
    accent: "#A02334",
  },
  {
    href: "/level/ssc-2",
    label: "SSC Part 2",
    sub: "Class 10",
    accent: "#2F6F6F",
  },
  {
    href: "/level/hssc-1",
    label: "HSSC Part 1",
    sub: "Class 11",
    accent: "#C9A227",
  },
  {
    href: "/level/hssc-2",
    label: "HSSC Part 2",
    sub: "Class 12",
    accent: "#3D4F91",
  },
];

export default function Home() {
  return (
    <main
      className="min-h-screen bg-[#FAF6EE]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Hero */}
      <section className="bg-[#1B2A4A] text-[#FAF6EE] px-6 pt-20 pb-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 39px, #FAF6EE 40px)",
          }}
        />

        <div className="max-w-3xl mx-auto text-center relative">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="h-px w-10 bg-[#C9A227]" />
            <span className="text-xs tracking-[0.25em] uppercase text-[#C9A227]">
              Student Resource Hub
            </span>
            <span className="h-px w-10 bg-[#C9A227]" />
          </div>

          <h1
            className="text-4xl md:text-6xl font-semibold leading-tight mb-5"
            style={{ fontFamily: "'Source Serif 4', serif" }}
          >
            Every past paper,
            <br />
            filed and findable.
          </h1>

          <p className="text-[#C9CEDE] text-lg max-w-xl mx-auto">
            Past papers, marking schemes, and notes — organized by class and
            subject, the way you&apos;d actually look for them.
          </p>
        </div>
      </section>

      {/* Level cards */}
      <section className="max-w-4xl mx-auto px-6 -mt-10 relative pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {levels.map((lvl) => (
            <Link
              key={lvl.href}
              href={lvl.href}
              className="bg-white border border-[#E4DCC8] rounded-lg p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all block"
            >
              <div
                className="w-10 h-1.5 rounded-full mb-4"
                style={{ backgroundColor: lvl.accent }}
              />
              <h3
                className="font-semibold text-2xl text-[#1B2A4A] mb-1"
                style={{ fontFamily: "'Source Serif 4', serif" }}
              >
                {lvl.label}
              </h3>
              <p className="text-sm text-[#5B6178]">{lvl.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#E4DCC8] py-8 px-6 text-center text-sm text-[#8A8574]">
        Built for students, by a student. Student Resource Hub.
      </footer>
    </main>
  );
}