import { Link } from 'react-router-dom'
import ReferenceFooter from '../components/ReferenceFooter.jsx'

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <Link to="/" className="font-bold text-slate-800 text-lg">⚔ Nat20</Link>
        <Link to="/app" className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition">
          Try free
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">How Nat20 scores skills</h1>
          <p className="text-sm text-slate-400 mt-2">
            A plain-language look at what the L1–L5 levels mean and where the model comes from.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">What Nat20 is actually measuring</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nat20 reads a document. It does not test you, interview you, or check your work. When it
            puts a level on a skill, it is describing <span className="font-medium">how strongly your
            resume backs that skill up</span> — not how good you are at it. Those are different
            things, and the gap between them is the whole point of the tool.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            If your resume undersells something you know well, Nat20 will score it low. That is a
            signal to fix the wording. If your resume oversells something, Nat20 may score it high —
            but the gap will still show up in an interview, no matter what this page says. Use the
            score to improve how your resume reads, not as a verdict on what you can do.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">What goes into a level</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            For each skill the JD asks for, Nat20 looks at four things in your resume:
          </p>
          <ul className="text-sm text-slate-600 leading-relaxed space-y-2 list-disc list-inside">
            <li>
              <span className="font-medium text-slate-700">Where it appears</span> — a skills list
              carries less weight than a bullet under a job, a project, or coursework.
            </li>
            <li>
              <span className="font-medium text-slate-700">How long</span> — a skill tied to a
              multi-year role reads as stronger evidence than one tied to a three-month project.
            </li>
            <li>
              <span className="font-medium text-slate-700">What the bullet says you did</span> — the
              complexity of the action verb. "Familiar with" reads differently from "built,"
              "designed," or "led."
            </li>
            <li>
              <span className="font-medium text-slate-700">How often it recurs</span> — a skill that
              shows up across several roles or projects reads as more established than a one-off
              mention.
            </li>
          </ul>
          <p className="text-sm text-slate-600 leading-relaxed">
            Those four signals are combined into a single composite and mapped to a level from L1 to
            L5. No single factor decides the outcome on its own.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">The five levels</h2>
          <ul className="text-sm text-slate-600 leading-relaxed space-y-2 list-disc list-inside">
            <li><span className="font-medium text-slate-700">L1 — Mentioned:</span> the skill appears on the resume with no supporting context.</li>
            <li><span className="font-medium text-slate-700">L2 — Limited evidence:</span> backed by coursework, a short project, or a brief mention.</li>
            <li><span className="font-medium text-slate-700">L3 — Supported:</span> backed by project work or internship context.</li>
            <li><span className="font-medium text-slate-700">L4 — Strong evidence:</span> backed by sustained job history or several distinct contexts.</li>
            <li><span className="font-medium text-slate-700">L5 — Extensive evidence:</span> backed by a multi-year professional history across more than one role.</li>
          </ul>
          <p className="text-sm text-slate-600 leading-relaxed">
            These labels describe the strength of the evidence on the page. They are not a mastery
            rating, and L5 is not a claim that you have nothing left to learn.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">The confidence dot</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Next to each level you will see a small coloured dot, and on some rows the words
            "high," "medium," or "low confidence." That is Nat20 telling you how sure it is that it
            read the skill correctly — for example, whether an acronym was unambiguous, or whether
            the surrounding text clearly tied the skill to real work. Low confidence means treat the
            level as a rough guess and check the wording yourself.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Where the model comes from</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            The five-level shape is informed by two things we found useful while building it: the U.S.
            Office of Personnel Management's five-level competency scale, which is a long-standing way
            of describing proficiency from awareness up to expert, and Bloom's revised taxonomy,
            which orders thinking from simple recall up to creating something new and is what shapes
            how Nat20 reads action verbs.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nat20's model is not a direct implementation of either one. It is our own interpretation,
            adapted for the narrow job of reading a resume against a job description. Where those
            frameworks describe a person's competence, Nat20 only ever describes what a document
            shows.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">What it cannot do</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nat20 cannot verify true ability, and it does not try to. It cannot tell whether a
            confident bullet is accurate or whether a modest one is hiding years of real work. It
            reads what is written. The output is a starting point for editing your resume and
            preparing for interviews — not a substitute for either, and not something to rely on
            alone when making decisions about a job.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Questions</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Email <a href="mailto:devteam@nat20app.com" className="text-indigo-600 hover:underline">devteam@nat20app.com</a>.
          </p>
        </section>
      </main>

      <ReferenceFooter />
    </div>
  )
}
