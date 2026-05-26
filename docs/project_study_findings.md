# A Universal Signal Vocabulary for JD and Resume Parsing: What the Standards Actually Say

## TL;DR
- **A three-bucket model of "Hard Skills / Soft Skills / Tasks-and-Methodologies" is *insufficient and non-canonical*; every major occupational standard (O*NET, ESCO, Lightcast, KSAO) uses at least four to seven parallel signal types, and the most defensible minimum for a cross-industry parser is five: Knowledge, Skills (developed capacities), Transversal/Soft Skills, Tasks/Work Activities, and Tools & Technology — with Qualifications/Certifications as an essential sixth.**
- **"Methodologies and work practices" (Agile, Scrum, TDD, peer review) are *not* a recognized top-level category in any major framework or labeled corpus; ESCO classifies them as skills/competences under "ICT project management methodologies," O*NET buries them inside Skills/Knowledge/DWAs, and every published NLP dataset (SkillSpan, Kompetencer, FIJO, Green et al. LREC 2022, Decorte) absorbs them into "Skill" or "Knowledge" — leaving them as a real but unmet design opportunity.**
- **Resume and JD signals are asymmetric: JDs emphasize Tasks/Responsibilities and required Skills/Knowledge; resumes emphasize realized Skills, Tools, and Experience evidence. Lightcast and Affinda parsers explicitly handle them with the *same* taxonomy but different field weights, and that is the right architectural choice — share the vocabulary, differ the extractor and the scoring.**

## Key Findings

1. **No occupational standard uses a 3-category model.** O*NET's Content Model has six top-level domains; the relevant signal-bearing taxonomies inside it are at least seven distinct descriptors (Skills, Knowledge, Abilities, Tasks, Detailed Work Activities, Tools, Technology Skills). ESCO has three pillars (Occupations, Skills, Qualifications); its Skills pillar alone has four sub-classifications (Knowledge, Skills, Transversal Skills, Language Skills and Knowledge). Lightcast distinguishes Common Skills, Specialized Skills, Software Skills, and Certifications/Licenses. KSAO (industrial-organizational psychology, Brannick, Cadle & Levine 2012) uses four: Knowledge, Skills, Abilities, Other characteristics (where "Other" covers interests, personality, and values).

2. **The "Task vs. Methodology" distinction the question asks about does exist in O*NET — but at a lower granularity than "hard vs. soft skill."** O*NET treats Tasks (occupation-specific, 19,000+ statements per the O*NET Resource Center: "more than 19,000 task statements are linked to over 2,000 detailed work activities, which are organized into 325 intermediate activities and ultimately nested into 41 generalized activities") as separate from Detailed Work Activities (2,000+ cross-occupational behaviors) which are separate from Generalized Work Activities (41 broad categories) which are separate from Skills (35 developed capacities). However, none of these is labeled "methodology"; Agile/Scrum/TDD live in O*NET's Technology Skills or Knowledge layers.

3. **ESCO is the most defensible single source for a shared JD+resume vocabulary.** Per ESCO's own ESCOpedia, "ESCO v1 contains 13890 concepts and is organised in a full hierarchy" in the skills pillar, plus 2,942 occupations in v1 (with 35 occupations and an additional 42 skills + 196 knowledge concepts added in v1.2, May 2024). It is multilingual (28 languages), publicly downloadable, and crosswalked to O*NET. Its skill-type flag (skill/competence vs knowledge) is the dominant annotation axis in modern NLP work (SkillSpan, Kompetencer, Decorte). Its transversal-skills hierarchy supplies a soft-skill taxonomy with five top categories: Thinking, Language, Application of Knowledge, Social Interaction, Attitudes and Values.

4. **Lightcast (formerly Burning Glass/Emsi) is the dominant commercial choice and is *empirically* derived from job postings and resumes** rather than expert-curated. Per Lightcast's own taxonomy page (lightcast.io/open-skills, March 2025): "Explore 34,000+ skills" organized into "31 Skill Categories," with a three-tier hierarchy: Category → Subcategory → Skill. Skill types: Common Skills, Specialized Skills, Software Skills, Certifications/Licenses, Spoken Languages. Lightcast is empirically discovered rather than expert-defined; methodologies (Agile, Scrum) appear as ordinary Specialized Skills.

5. **Published NLP datasets do not validate a 3-category schema.** Green, Maynard & Lin (LREC 2022) tried to separate hard vs. soft skills and reported that annotators "were largely unable to differentiate" them, collapsing into a single Skill label plus Qualification, Experience, Occupation, Domain. SkillSpan (Zhang et al., NAACL 2022, "Hard and Soft Skill Extraction from English Job Postings") consists, per the ACL Anthology paper page, of "14.5K sentences and over 12.5K annotated spans," originally annotated for hard and soft skills by domain experts (subsequent ESCO-aligned work like Kompetencer re-cast the two labels as Skill and Knowledge). FIJO (Beauchemin et al., 2022) uses four soft-skill-only labels: Thoughts, Results, Relational, Personal. None of these treats methodology as a class.

6. **Resume parsers and JD parsers diverge primarily in *section recognition*, not in vocabulary.** Resume parsers detect Contact, Work Experience (with company/title/dates/responsibilities), Education, Skills, Certifications. JD parsers detect Title, Description/Responsibilities, Qualifications, Skills, Experience Requirements (per schema.org/JobPosting). The skill-extraction NLP layer is identical in both — Lightcast, Affinda, and Workable explicitly run the same parser over both document types.

7. **Universal applicability is genuine but imperfect.** ESCO and O*NET were designed for cross-industry use (ESCO covers ~2,977 occupations spanning bartenders to nuclear physicists; O*NET-SOC 2019 covers 1,016 occupational titles of which 923 are data-level occupations across the entire US economy). Known failure modes for tech-centric skill libraries on non-tech roles: (a) over-indexing on Software/Tools and under-coverage of physical/manual skills; (b) inability to separate licensure/regulatory requirements from skills (e.g., RN license, CDL); (c) hospitality and trades use task-language ("clean rooms", "operate forklift") that maps poorly to "skill" concepts and better to O*NET Tasks/DWAs; (d) the O*NET content model itself was critiqued in the Journal for Labour Market Research (Handel, 2016) as weak on information-technology coverage — "There are items on working with manufacturing technology, but very few relating to information technology and they tend to be too general or ambiguous" — and has had to bolt on a separate Tools & Technology (T2) module.

## Details

### 1. The three-category question, definitively

The proposed taxonomy — Hard Skills, Soft Skills, Tasks+Methodologies — is intuitive but conflates two axes that every authoritative framework keeps separate:

- **The skill-vs-task axis.** A "skill" is a developed capacity that transfers across jobs (O*NET definition: "developed capacities that facilitate learning and the performance of activities that occur across jobs"). A "task" is "specific work activities that can be unique for each occupation" (O*NET). Lumping them loses the most important signal-bearing distinction in occupational science.
- **The skill-vs-knowledge axis.** ESCO's primary classification is whether a concept is a skill/competence (an action capacity) or knowledge (a body of facts/principles/methodologies). ESCO classifies "agile project management" as a skill/competence with the description "The agile project management approach is a methodology for planning, managing and overseeing of ICT resources in order to meet specific goals and using project management ICT tools" — it's an action capacity, not an information body. ESCOpedia: "The ESCO skills pillar distinguishes between i) skill/competence concepts and ii) knowledge concepts by indicating the skill type."

Recommendation for a universal parser: adopt ESCO's pillar structure (Knowledge / Skill / Transversal Skill / Language Skill) plus O*NET's Tasks + Tools & Technology + Qualifications/Licenses, yielding a 6-bucket minimum schema.

### 2. O*NET, ESCO, Lightcast side-by-side

**O*NET (US Department of Labor)** organizes work into six domains: Worker Characteristics, Worker Requirements, Experience Requirements, Occupational Requirements, Occupation-Specific Information, and Workforce Characteristics. The signal-bearing descriptors used by NLP pipelines are:
- **Skills** (2.A Basic, 2.B Cross-Functional) — 35 descriptors aggregated into 7 sub-categories (content, process, social, complex problem-solving, technical, systems, resource management).
- **Knowledge** (2.C) — organized sets of principles and facts (e.g., Mathematics, Mechanical).
- **Abilities** (1.A) — enduring attributes (e.g., Deductive Reasoning).
- **Work Styles** (1.C) — personality tendencies; this is where soft-skill-like signals live.
- **Tasks** (5.A) — 19,000+ occupation-specific statements.
- **Detailed Work Activities** (4.D) — 2,000+ cross-occupational behaviors.
- **Intermediate / Generalized Work Activities** (4.E / 4.A) — 325 / 41 categories.
- **Tools and Technology** (5.G / 5.F) — separate dictionary of machines, equipment, software.

**ESCO (European Commission)** has three pillars:
- **Occupations pillar** (2,942 occupations in v1, growing to 2,977 with v1.2 additions; ISCO-08 backbone provides top four levels).
- **Skills pillar** (13,890 concepts in v1, four sub-classifications: Knowledge, Skills, Transversal Skills, Language Skills and Knowledge).
- **Qualifications pillar** (formal credentials).

ESCO's transversal-skills hierarchy is the most directly usable soft-skill taxonomy: Thinking; Language; Application of Knowledge; Social Interaction; Attitudes and Values. ESCO links each occupation to "essential" vs "optional" skills/knowledge.

**Lightcast (formerly Burning Glass + Emsi)** maintains 34,000+ skills updated monthly from real job postings/resumes/profiles. Three-tier hierarchy: Category (31 broad areas) → Subcategory → Skill. Skill types: Common Skills, Specialized Skills, Software Skills, Certifications/Licenses, Spoken Languages. Lightcast is empirically discovered rather than expert-defined; methodologies (Agile, Scrum) appear as ordinary Specialized Skills.

### 3. Tasks vs. Methodologies — the question's most novel claim

The user's hypothesis that "methodologies/practices" (Agile, TDD, code review) deserve a category distinct from both "skills" and "tasks" is **not** recognized in any standard:
- ESCO classifies "agile project management" as a skill/competence under ICT project management methodologies.
- O*NET does not have a methodology layer; Agile/Scrum show up under Knowledge ("Computers and Electronics") or sometimes under Detailed Work Activities ("Apply agile project management methods").
- Lightcast treats Agile as a Specialized Skill, not a separate signal.
- No published NLP corpus annotates methodologies as a distinct entity class (confirmed across SkillSpan, Kompetencer, FIJO, Green et al. LREC 2022, Decorte 2022, JAAT 2025).

**However, the underlying intuition is sound.** O*NET *does* separate Tasks (what you do) from Skills (capacities) from Tools & Technology (what you use), and modern O*NET-aligned NLP pipelines like JAAT (Meisenbacher, Nestorov, Norlander, arXiv:2510.01470, Oct 2025) explicitly extract Tasks, Skills, and Tools as parallel signals. Per the JAAT paper: "We extract more than 10 billion data points from more than 155 million online job ads provided by the National Labor Exchange (NLx) Research Hub, including O*NET tasks, occupation codes, tools, and technologies, as well as wages, skills, industry, and more features." If a parser wants to surface "the candidate practices Agile and TDD" as separate from "the candidate knows Java" and "the candidate develops algorithms," the cleanest path is to:
- Use ESCO/Lightcast for the skill+knowledge vocabulary.
- Use O*NET DWAs for cross-occupational task statements.
- Mint a custom "Methodology/Practice" label as a *sub-type* of Knowledge (ESCO-style) or as a tag on Specialized Skills (Lightcast-style), but recognize this is a design extension, not an inherited standard.

### 4. Resume vs. JD signal symmetry

The same skill vocabulary is appropriate for both documents, but the *containers* differ:

- **JDs** (per schema.org/JobPosting and JDX JobSchema+) have: `title`, `description`, `responsibilities`, `qualifications`, `skills`, `experienceRequirements`, `educationRequirements`, `occupationalCategory`. Tasks/duties dominate the `responsibilities` field; required skills/knowledge dominate `qualifications` and `skills`.
- **Resumes** (per Workable, Affinda, Indeed parsing conventions) have: Contact, Summary, Work Experience (with sub-fields company/title/dates/bullets of accomplishments), Education, Skills, Certifications. Task-like statements appear inside Work Experience bullets ("Managed new and refill prescriptions for over 300 patients"); declared skills appear in the Skills section.

Industry practice (Lightcast, Affinda, Workable, X0PA): run the *same* skill extractor over both, but score matches differently — a skill *declared* in a resume Skills section is weaker evidence than the same skill *demonstrated* via a task bullet in Work Experience. Lightcast describes its taxonomy as "an open-source library of 32,000+ skills gathered from hundreds of millions of online job postings, profiles, and resumes—updated every two weeks" using a single shared vocabulary — exactly the architecture the user is contemplating.

### 5. Universal applicability and failure modes

ESCO and O*NET were both designed for cross-industry use and do cover non-tech occupations comprehensively (bartender, nurse practitioner, welder, teacher). The known failure modes when using a single taxonomy across industries:

- **Tech-centric skill libraries over-fit to software.** The Lightcast taxonomy's 31 categories include Information Technology, but trades and hospitality skills are thinner. Lightcast acknowledges this asymmetry: "We include Common Skills (like communication or problem-solving), Specialized Skills (like Java or financial analysis), and Certifications and Licenses (like CompTIA Security+ or certified radiological nurse)."
- **O*NET's IT coverage is weak by its own admission.** The Journal for Labour Market Research review of O*NET notes: "There are items on working with manufacturing technology, but very few relating to information technology and they tend to be too general or ambiguous." This led to the bolt-on Tools & Technology module.
- **Healthcare uses a parallel "non-technical skills" vocabulary** (NOTSS for surgeons, ANTS for anaesthetists, SPLINTS for scrub practitioners, NOTECHS for whole teams) developed independently from aviation Crew Resource Management research. These don't map cleanly to ESCO transversal skills, though they overlap.
- **Trades and manual work** under-utilize the "skill" layer and over-utilize the "task" layer. A forklift operator JD is mostly tasks and tools; a software engineer JD is mostly skills and knowledge. A parser using only "skills" will lose most of the trades signal.
- **Licensure/regulatory requirements** (RN, CDL, PE, bar admission) are categorically different from skills and must be a separate bucket. ESCO Qualifications pillar and Lightcast Certifications/Licenses both handle this; a 3-bucket model does not.

### 6. NLP/parsing approaches and labeled corpora

The state of the art:
- **SkillSpan** (Zhang, Jensen, Sonniks & Plank, NAACL 2022, "Hard and Soft Skill Extraction from English Job Postings") — 14.5K sentences and over 12.5K annotated spans from English job postings, span-level annotation for hard and soft skills (re-cast as Skill and Knowledge labels in subsequent ESCO-aligned work). The de-facto English benchmark.
- **Kompetencer** (Zhang, Jensen, Plank, LREC 2022) — Danish job postings, Skill/Knowledge labels mapped to ESCO via distant supervision.
- **FIJO** (Beauchemin, Laumonier, Le Ster, Yassine, 2022, arXiv:2204.05208) — French insurance JDs, four soft-skill-only labels (Thoughts, Results, Relational, Personal), drawn from the AQESSS/Korn Ferry/SPB skill repositories.
- **Green, Maynard, Lin** (LREC 2022, "Development of a Benchmark Corpus to Support Entity Recognition in Job Descriptions") — 18.6K entities across 5 types: Skill, Qualification, Experience, Occupation, Domain. Explicitly tried and rejected separating hard from soft skills because annotators couldn't reliably distinguish them.
- **Sayfullina, Malmi & Kannala** (2018) — soft skill matching with a binary candidate-vs-other classifier on job ads and CVs.
- **SkillNER** (Fareri et al., 2021, arXiv:2101.11431) — SVM-based soft-skill NER trained on scientific papers, tested on ESCO job descriptions.
- **Chinese-SkillSpan** (2024) — ESCO-aligned, four-axis (knowledge/skill/language/transversal) following ESCO's hierarchy, 20,000+ annotated instances.
- **Decorte et al.** (2022, RecSys-in-HR) — ESCO extreme multi-label classification with negative sampling against ~13.9K leaf labels.
- **JAAT/NLx** (Meisenbacher, Nestorov, Norlander, arXiv:2510.01470, Oct 2025) — open-source pipeline that extracts O*NET Tasks, Skills, Tools, Title, Wage, Industry as **separate** signals: "more than 10 billion data points from more than 155 million online job ads." This is the cleanest existing example of multi-signal JD parsing.
- **CareerBERT** (Rosenberger, Wolfrum, Weinzierl, Kraus, Zschech, 2025, arXiv:2503.02056) — matches resumes to ESCO jobs in a shared embedding space using EURES job advertisements as the corpus.

The dominant approaches are: (a) **span-level NER** with 2–5 entity types; (b) **extreme multi-label classification** against ESCO's ~13.9K leaves; (c) **bi-encoder retrieval** mapping spans to taxonomy concepts; (d) **LLM-based zero-shot extraction** (Skill-LLM, Clavié & Soulié 2023). The HR Open Standards consortium and US Chamber of Commerce JDX JobSchema+ initiative are building interoperability standards on top of schema.org/JobPosting.

## Recommendations

**For the user's universal JD+resume parser, do this:**

1. **Adopt ESCO as the primary shared vocabulary** (skills + knowledge + transversal + language). It is free, multilingual, ontology-defined, has stable URIs, crosswalks to O*NET, and is the dominant choice in academic NLP work. License is permissive (EU public sector). If commercial coverage or English-market freshness is paramount, layer Lightcast Open Skills on top (Lightcast is updated monthly versus ESCO's slower revision cycle).

2. **Use a six-bucket signal schema, not three**, with these buckets shared between JD and resume:
   - **Knowledge** (bodies of facts, theories, methodologies — Agile as a *theory* lives here)
   - **Skills** (developed action capacities — "develop algorithms," "apply Agile project management" live here)
   - **Transversal/Soft Skills** (using ESCO's 5-category hierarchy: Thinking, Language, Application of Knowledge, Social Interaction, Attitudes and Values)
   - **Tasks/Responsibilities** (free-text spans mapped to O*NET DWAs for cross-role comparability)
   - **Tools & Technologies** (software, equipment, languages — maps to O*NET 5.F/5.G and Lightcast Software Skills)
   - **Qualifications/Certifications/Licenses** (ESCO Qualifications pillar; Lightcast Certifications)

3. **Treat "Methodology/Practice" as a sub-type tag on Knowledge or Skills**, not as a top-level bucket. Maintain a curated list (Agile, Scrum, Kanban, TDD, BDD, DevOps, Six Sigma, Lean, PRINCE2, ITIL, peer review, code review, Waterfall) with `practice=true` flags on existing ESCO/Lightcast concepts. This gives you the "how" signal the user wants without breaking standards alignment.

4. **Share the vocabulary across JD and resume; differ the extractor and the weights.** For JDs, weight Skills + Knowledge + Qualifications (these are *requirements*). For resumes, weight Skills + Tools + Tasks-evidenced-in-Work-Experience (these are *demonstrated*). Use schema.org/JobPosting field semantics for JDs and standard resume section headers for resumes.

5. **Anchor matching at the taxonomy-concept level, not the surface-string level.** "PyTorch", "Py Torch", "torch" all resolve to the same ESCO/Lightcast concept ID. This is where universal cross-industry matching becomes tractable.

6. **For non-tech robustness, weight O*NET Tasks/DWAs more heavily.** In trades, hospitality, and healthcare, the most reliable signal is task language ("administer medications", "perform safety inspections", "operate CNC lathe"), not skill labels. Use the JAAT toolkit (open-source, Oct 2025) as a reference implementation for task extraction.

**Benchmarks that should trigger a redesign:**
- If skill-extraction F1 on SkillSpan-style benchmarks drops below ~0.50 for your span model, switch from NER to bi-encoder retrieval (CROSSAGE with JobSpanBERT reportedly reaches 49.8 F1 on SkillSpan SKILL entities).
- If resume-to-JD match recall is below 60% on non-tech roles, your library is tech-skewed — augment with ESCO transversal skills or O*NET DWAs.
- If "Agile vs. Java" can't be distinguished as practice vs. tool in your output, add the practice-tag layer.

## Caveats

- **There is no industry consensus on a single shared resume/JD vocabulary.** HR Open Standards, Schema.org JobPosting, JDX JobSchema+, ESCO, O*NET, and Lightcast are all partial overlapping standards; none is dominant.
- **Hard-vs-soft skill is empirically hard to annotate.** Green et al. (LREC 2022) explicitly abandoned the distinction; annotators couldn't agree, and the authors wrote that the Hard Skill and Soft Skill classes were "collapsed into one all-encompassing 'Skill' classification." Build for fuzzy classification, not crisp separation.
- **ESCO and O*NET are slow to update** (multi-year cycles; ESCO v1.2 added only 42 new skills and 196 knowledge concepts in May 2024). Emerging skills (generative AI tooling, specific frameworks) appear in Lightcast months to years before ESCO. If real-time market coverage matters, use Lightcast or supplement with continual fine-tuning on fresh job postings.
- **Bias and parsing errors compound.** Sapia.ai and other vendors warn that resume parsing amplifies formatting bias; chronological, plain-text resumes parse far more accurately than functional or graphical ones. This is a property of the document layout, not the vocabulary, but it limits any signal-extraction system.
- **No published corpus validates the user's exact proposed schema.** The closest is JAAT (Oct 2025 preprint, not peer reviewed) which separates Tasks, Skills, and Tools but does not annotate methodologies. Your design will be slightly ahead of the published literature — defensible but novel.
- **"Universal" should not mean "uniform."** Healthcare's non-technical-skills tradition (NOTSS, ANTS, SPLINTS, NOTECHS) and trades' apprenticeship/competency frameworks have their own valid vocabularies. A universal parser should *map to* these where they exist, not replace them.