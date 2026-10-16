// Demo dataset used ONLY when Supabase is not configured yet (preview mode).
// Once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set, all data comes from Supabase.
// Demo content follows the active UI language (ar / en / fr) so the preview
// never mixes languages.
import type { Profile, Post, Book, SiteSettings, BookRequest } from '@/types'
import type { Lang } from '@/i18n'

// current UI language, read lazily so demo content always matches the UI
const demoLang = (): Lang => {
  const l = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) as Lang | null
  return l === 'en' || l === 'fr' ? l : 'ar'
}

const d = (days: number) => new Date(Date.now() - days * 86400000).toISOString()

// ---------------------------------------------------------------- Arabic
const profileAr: Profile = {
  id: 'demo', first_name: 'أحمد', last_name: 'النموذجي',
  academic_title: 'أستاذ الفلسفة', specialty: 'الفلسفة المعاصرة والأخلاق',
  field: 'العلوم الإنسانية', institution: 'الجامعة النموذجية', location: 'القاهرة، مصر',
  short_bio: 'باحث وكاتب مهتم بقضايا الأخلاق والتأويل وفلسفة الثقافة، له أكثر من عشرين عاماً في التدريس والنشر.',
  long_bio: 'الدكتور أحمد النموذجي أستاذ الفلسفة، تتركز أبحاثه في الأخلاق المعاصرة والتأويلية وفلسفة الثقافة. نشر العديد من الدراسات في مجلات محكّمة وألّف كتباً تجسر بين البحث الأكاديمي والقارئ العام.\n\nيشمل تدريسه الفلسفة الحديثة والأخلاق ومنهجية البحث، ويشرف على أبحاث الدراسات العليا في العلوم الإنسانية.',
  avatar_url: '', email: 'ahmed.example@university.edu', phone: '', whatsapp: '',
  google_scholar: 'https://scholar.google.com', orcid: 'https://orcid.org/0000-0000-0000-0000',
  researchgate: 'https://www.researchgate.net', linkedin: 'https://www.linkedin.com',
  facebook: '', x: '', website: '',
  qualifications: ['دكتوراه في الفلسفة — الجامعة النموذجية (2008)', 'ماجستير في الأخلاق (2003)', 'بكالوريوس في الفلسفة (2000)'],
  interests: ['الأخلاق المعاصرة', 'التأويلية', 'فلسفة الثقافة', 'الإنسانيات الرقمية'],
}

const postsAr: Post[] = [
  { id: 'p1', title: 'في أخلاقيات القراءة', slug: 'ethics-of-reading', excerpt: 'ماذا يعني أن نقرأ بمسؤولية؟ ملاحظات حول الانتباه والتأويل والصدق الفكري.', content: '## لماذا تُعد القراءة فعلاً أخلاقياً\n\nالقراءة ليست محايدة أبداً؛ فأن تقرأ نصاً يعني أن تدخل في علاقة مسؤولية مع عقل آخر.\n\n> "القارئ يُتمّ العمل ويخونه في اللفتة نفسها."\n\n### الانتباه بوصفه فضيلة\n\nالقراءة البطيئة تقاوم اقتصاد التشتت:\n\n- تستعيد عمق التجربة\n- تدرّب ملكة الحكم\n- تزرع التواضع أمام النص\n\n**التأويل** يبدأ حيث تنتهي *العجلة*.', cover_url: '', category: 'فلسفة', tags: ['أخلاق', 'قراءة'], published: true, featured: true, published_at: d(3), created_at: d(3) },
  { id: 'p2', title: 'التأويلية في العصر الرقمي', slug: 'hermeneutics-digital-age', excerpt: 'هل تستطيع مناهج الفهم الكلاسيكية النجاة من زمن التدفق؟ بيان موجز من أجل القراءة العميقة.', content: '## التدفق والنص\n\nالبيئات الرقمية تُفتّت الانتباه، والتأويلية — بوصفها فنّ الفهم — تقدّم أدوات للمقاومة.\n\n### ثلاثة مبادئ\n\n1. السياق قبل الحكم\n2. حسن الظن قبل النقد\n3. التمهّل قبل المشاركة\n\n> الفهم حدثٌ، وليس تنزيلاً.', cover_url: '', category: 'بحث', tags: ['تأويلية', 'رقمي'], published: true, featured: true, published_at: d(12), created_at: d(12) },
  { id: 'p3', title: 'ملاحظات في الكتابة الأكاديمية', slug: 'notes-academic-writing', excerpt: 'الوضوح واجب أخلاقي. ملاحظات عملية لكتابة بحث يستحق أن يُقرأ.', content: '## اكتب لتُفهَم\n\nالغموض ليس عمقاً؛ خير النثر الأكاديمي ما كان *وضّاحاً* و**صادقاً**.\n\n- فكرة واحدة لكل فقرة\n- الأفعال قبل الأسماء\n- احذف كل جملة تستعرض\n\n> الأسلوب هو أخلاق الفكر.', cover_url: '', category: 'كتابة', tags: ['كتابة', 'منهج'], published: true, featured: true, published_at: d(25), created_at: d(25) },
  { id: 'p4', title: 'الدور العام للأستاذ الجامعي', slug: 'public-role-professor', excerpt: 'بين قاعة الدرس والساحة العامة: ما الذي ندين به للمجتمع؟', content: '## خارج البرج العاجي\n\nالمعرفة أمانة عامة، والأستاذ الذي لا يغادر قاعة الندوة يتخلى عن نصف رسالته.\n\nالانخراط العام لا يعني التبسيط — بل *الترجمة* دون خيانة.', cover_url: '', category: 'فلسفة', tags: ['جامعة', 'عام'], published: true, featured: false, published_at: d(40), created_at: d(40) },
]

const booksAr: Book[] = [
  { id: 'b1', title: 'مدخل إلى الأخلاق المعاصرة', slug: 'intro-contemporary-ethics', description: 'مدخل واضح ورصين إلى أهم تيارات الفكر الأخلاقي المعاصر، كُتب للطلاب وللقارئ العام على حد سواء.', author: 'د. أحمد النموذجي', year: 2023, pages: 284, cover_url: '', pdf_url: '', preview_url: '', price: 0, currency: 'USD', type: 'FREE', published: true, featured: true, featured_order: 1, created_at: d(90) },
  { id: 'b2', title: 'التأويلية: الفهم والتفسير', slug: 'hermeneutics-understanding', description: 'دراسة في نظرية التأويل من شلايرماخر إلى ريكور، مع تطبيقات جديدة على النصوص الرقمية.', author: 'د. أحمد النموذجي', year: 2021, pages: 342, cover_url: '', pdf_url: '', preview_url: '', price: 24, currency: 'USD', type: 'PAID', published: true, featured: true, featured_order: 2, created_at: d(400) },
  { id: 'b3', title: 'مقالات في فلسفة الثقافة', slug: 'essays-philosophy-culture', description: 'مقالات مختارة في الثقافة والذاكرة والحداثة. متوفرة ورقياً عند الطلب.', author: 'د. أحمد النموذجي', year: 2019, pages: 210, cover_url: '', pdf_url: '', preview_url: '', price: null, currency: 'USD', type: 'REQUEST', published: true, featured: false, featured_order: 3, created_at: d(700) },
]

// ---------------------------------------------------------------- English
const profileEn: Profile = {
  ...profileAr,
  first_name: 'Ahmed', last_name: 'Example',
  academic_title: 'Professor of Philosophy', specialty: 'Contemporary Philosophy & Ethics',
  field: 'Humanities', institution: 'Example University', location: 'Cairo, Egypt',
  short_bio: 'Researcher and writer interested in ethics, hermeneutics, and the philosophy of culture, with over twenty years of teaching and publishing.',
  long_bio: 'Dr. Ahmed Example is a professor of philosophy whose work focuses on contemporary ethics, hermeneutics, and the philosophy of culture. He has published widely in peer-reviewed journals and authored several books bridging academic research and the public sphere.\n\nHis teaching covers modern philosophy, ethics, and research methodology, and he supervises graduate research across the humanities.',
  qualifications: ['PhD in Philosophy — Example University (2008)', 'MA in Ethics — Example University (2003)', 'BA in Philosophy (2000)'],
  interests: ['Contemporary Ethics', 'Hermeneutics', 'Philosophy of Culture', 'Digital Humanities'],
}

const postsEn: Post[] = [
  { id: 'p1', title: 'On the Ethics of Reading', slug: 'ethics-of-reading', excerpt: 'What does it mean to read responsibly? Notes on attention, interpretation, and intellectual honesty.', content: '## Why reading is an ethical act\n\nReading is never neutral. To read a text is to enter into a relationship of responsibility with another mind.\n\n> "The reader completes the work, and betrays it, in the same gesture."\n\n### Attention as a virtue\n\nSlow reading resists the economy of distraction:\n\n- it restores depth to experience\n- it trains judgement\n- it cultivates humility before the text\n\n**Interpretation** begins where *haste* ends.', cover_url: '', category: 'Philosophy', tags: ['ethics', 'reading'], published: true, featured: true, published_at: d(3), created_at: d(3) },
  { id: 'p2', title: 'Hermeneutics in the Digital Age', slug: 'hermeneutics-digital-age', excerpt: 'Can classical methods of interpretation survive the feed? A brief manifesto for deep reading.', content: '## The feed and the text\n\nDigital environments fragment attention. Hermeneutics — the art of understanding — offers tools to resist.\n\n### Three principles\n\n1. Context before judgement\n2. Charity before critique\n3. Slowness before sharing\n\n> Understanding is an event, not a download.', cover_url: '', category: 'Research', tags: ['hermeneutics', 'digital'], published: true, featured: true, published_at: d(12), created_at: d(12) },
  { id: 'p3', title: 'Notes on Academic Writing', slug: 'notes-academic-writing', excerpt: 'Clarity is a moral duty. Practical notes on writing research that deserves to be read.', content: '## Write to be understood\n\nObscurity is not depth. The best academic prose is *lucid* and **honest**.\n\n- One idea per paragraph\n- Verbs over nouns\n- Cut every sentence that shows off\n\n> Style is the morality of thought.', cover_url: '', category: 'Writing', tags: ['writing', 'method'], published: true, featured: true, published_at: d(25), created_at: d(25) },
  { id: 'p4', title: 'The Public Role of the Professor', slug: 'public-role-professor', excerpt: 'Between the lecture hall and the public square: what do we owe society?', content: '## Beyond the ivory tower\n\nKnowledge is a public trust. The professor who never leaves the seminar room abandons half the vocation.\n\nEngagement does not mean simplification — it means *translation* without betrayal.', cover_url: '', category: 'Philosophy', tags: ['public', 'university'], published: true, featured: false, published_at: d(40), created_at: d(40) },
]

const booksEn: Book[] = [
  { id: 'b1', title: 'Introduction to Contemporary Ethics', slug: 'intro-contemporary-ethics', description: 'A clear and rigorous introduction to the main currents of contemporary ethical thought, written for students and general readers alike.', author: 'Dr. Ahmed Example', year: 2023, pages: 284, cover_url: '', pdf_url: '', preview_url: '', price: 0, currency: 'USD', type: 'FREE', published: true, featured: true, featured_order: 1, created_at: d(90) },
  { id: 'b2', title: 'Hermeneutics: Understanding and Interpretation', slug: 'hermeneutics-understanding', description: 'A monograph on the theory of interpretation from Schleiermacher to Ricoeur, with new applications to digital texts.', author: 'Dr. Ahmed Example', year: 2021, pages: 342, cover_url: '', pdf_url: '', preview_url: '', price: 24, currency: 'USD', type: 'PAID', published: true, featured: true, featured_order: 2, created_at: d(400) },
  { id: 'b3', title: 'Essays on the Philosophy of Culture', slug: 'essays-philosophy-culture', description: 'Collected essays on culture, memory, and modernity. Available in print upon request.', author: 'Dr. Ahmed Example', year: 2019, pages: 210, cover_url: '', pdf_url: '', preview_url: '', price: null, currency: 'USD', type: 'REQUEST', published: true, featured: false, featured_order: 3, created_at: d(700) },
]

// ---------------------------------------------------------------- Français
const profileFr: Profile = {
  ...profileAr,
  first_name: 'Ahmed', last_name: 'Example',
  academic_title: 'Professeur de philosophie', specialty: 'Philosophie contemporaine & éthique',
  field: 'Sciences humaines', institution: 'Université Exemple', location: 'Le Caire, Égypte',
  short_bio: 'Chercheur et écrivain intéressé par l’éthique, l’herméneutique et la philosophie de la culture, avec plus de vingt ans d’enseignement et de publications.',
  long_bio: 'Le Pr Ahmed Example est professeur de philosophie. Ses travaux portent sur l’éthique contemporaine, l’herméneutique et la philosophie de la culture. Il a publié de nombreux articles dans des revues à comité de lecture et plusieurs ouvrages reliant la recherche académique au grand public.\n\nSon enseignement couvre la philosophie moderne, l’éthique et la méthodologie de la recherche.',
  qualifications: ['Doctorat en philosophie — Université Exemple (2008)', 'Master en éthique (2003)', 'Licence de philosophie (2000)'],
  interests: ['Éthique contemporaine', 'Herméneutique', 'Philosophie de la culture', 'Humanités numériques'],
}

const postsFr: Post[] = [
  { id: 'p1', title: 'De l’éthique de la lecture', slug: 'ethics-of-reading', excerpt: 'Que signifie lire de manière responsable ? Notes sur l’attention, l’interprétation et l’honnêteté intellectuelle.', content: '## Pourquoi lire est un acte éthique\n\nLire n’est jamais neutre : c’est entrer en relation de responsabilité avec un autre esprit.\n\n> « Le lecteur achève l’œuvre et la trahit dans le même geste. »\n\n### L’attention comme vertu\n\nLa lecture lente résiste à l’économie de la distraction :\n\n- elle restaure la profondeur\n- elle entraîne le jugement\n- elle cultive l’humilité devant le texte\n\n**L’interprétation** commence là où *la hâte* s’arrête.', cover_url: '', category: 'Philosophie', tags: ['éthique', 'lecture'], published: true, featured: true, published_at: d(3), created_at: d(3) },
  { id: 'p2', title: 'L’herméneutique à l’ère numérique', slug: 'hermeneutics-digital-age', excerpt: 'Les méthodes classiques d’interprétation peuvent-elles survivre au flux ? Petit manifeste pour la lecture profonde.', content: '## Le flux et le texte\n\nLes environnements numériques fragmentent l’attention. L’herméneutique — l’art de comprendre — offre des outils de résistance.\n\n### Trois principes\n\n1. Le contexte avant le jugement\n2. La charité avant la critique\n3. La lenteur avant le partage\n\n> Comprendre est un événement, pas un téléchargement.', cover_url: '', category: 'Recherche', tags: ['herméneutique', 'numérique'], published: true, featured: true, published_at: d(12), created_at: d(12) },
  { id: 'p3', title: 'Notes sur l’écriture académique', slug: 'notes-academic-writing', excerpt: 'La clarté est un devoir moral. Notes pratiques pour une recherche qui mérite d’être lue.', content: '## Écrire pour être compris\n\nL’obscurité n’est pas la profondeur. La meilleure prose académique est *lucide* et **honnête**.\n\n- Une idée par paragraphe\n- Des verbes plutôt que des noms\n- Couper toute phrase qui parade\n\n> Le style est la morale de la pensée.', cover_url: '', category: 'Écriture', tags: ['écriture', 'méthode'], published: true, featured: true, published_at: d(25), created_at: d(25) },
  { id: 'p4', title: 'Le rôle public du professeur', slug: 'public-role-professor', excerpt: 'Entre l’amphithéâtre et la place publique : que devons-nous à la société ?', content: '## Au-delà de la tour d’ivoire\n\nLe savoir est un bien commun. Le professeur qui ne quitte jamais le séminaire abandonne la moitié de sa vocation.\n\nS’engager ne veut pas dire simplifier — c’est *traduire* sans trahir.', cover_url: '', category: 'Philosophie', tags: ['public', 'université'], published: true, featured: false, published_at: d(40), created_at: d(40) },
]

const booksFr: Book[] = [
  { id: 'b1', title: 'Introduction à l’éthique contemporaine', slug: 'intro-contemporary-ethics', description: 'Une introduction claire et rigoureuse aux principaux courants de la pensée éthique contemporaine, pour étudiants et grand public.', author: 'Pr Ahmed Example', year: 2023, pages: 284, cover_url: '', pdf_url: '', preview_url: '', price: 0, currency: 'USD', type: 'FREE', published: true, featured: true, featured_order: 1, created_at: d(90) },
  { id: 'b2', title: 'Herméneutique : comprendre et interpréter', slug: 'hermeneutics-understanding', description: 'Une monographie sur la théorie de l’interprétation, de Schleiermacher à Ricœur, avec des applications aux textes numériques.', author: 'Pr Ahmed Example', year: 2021, pages: 342, cover_url: '', pdf_url: '', preview_url: '', price: 24, currency: 'USD', type: 'PAID', published: true, featured: true, featured_order: 2, created_at: d(400) },
  { id: 'b3', title: 'Essais sur la philosophie de la culture', slug: 'essays-philosophy-culture', description: 'Essais réunis sur la culture, la mémoire et la modernité. Version imprimée sur demande.', author: 'Pr Ahmed Example', year: 2019, pages: 210, cover_url: '', pdf_url: '', preview_url: '', price: null, currency: 'USD', type: 'REQUEST', published: true, featured: false, featured_order: 3, created_at: d(700) },
]

// ---------------------------------------------------------------- accessors
const profiles: Record<Lang, Profile> = { ar: profileAr, en: profileEn, fr: profileFr }
const postsByLang: Record<Lang, Post[]> = { ar: postsAr, en: postsEn, fr: postsFr }
const booksByLang: Record<Lang, Book[]> = { ar: booksAr, en: booksEn, fr: booksFr }

export function getDemoProfile(): Profile { return profiles[demoLang()] }
export function getDemoPosts(): Post[] { return postsByLang[demoLang()] }
export function getDemoBooks(): Book[] { return booksByLang[demoLang()] }

export const demoSettings: SiteSettings = {
  id: 'demo', site_name: 'Academic Profile', site_description: 'The official personal platform — research, writing and books.',
  hero_image_url: '', posts_per_page: 3, books_per_page: 3,
  show_about: true, show_blog: true, show_books: true, show_social: true, show_contact: true, maintenance_mode: false,
}

export const demoRequests: BookRequest[] = []
