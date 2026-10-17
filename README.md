# Academic Profile

منصة شخصية أكاديمية متكاملة للباحثين والأساتذة والكتّاب — React + Vite + Tailwind + Supabase، تعمل بالكامل بدون خادم Backend مستقل، وقابلة للنشر على GitHub Pages.

A complete personal academic platform (blog, books, book requests, admin dashboard) — React + Vite + Tailwind + Supabase, no standalone backend, deployable to GitHub Pages.

---

## المزايا

- صفحة رئيسية سينمائية (Hero, About, Expertise, Featured Posts, Books, Links, Contact)
- مدونة كاملة: بحث، تصنيفات، مقالات ذات صلة، محرر Markdown مبسّط
- كتب بثلاثة أنواع: مجاني (تحميل PDF مباشر) / مدفوع (نموذج طلب) / عند الطلب
- لوحة تحكم محمية بـ Supabase Auth + RLS (إدارة التدوينات، الكتب، الطلبات، الملف الشخصي، الإعدادات، وضع الصيانة)
- ثلاث لغات: العربية (RTL)، الفرنسية، الإنجليزية
- PWA قابل للتثبيت + SEO ديناميكي (OG / Twitter Card / canonical)
- الأمان الحقيقي عبر Row Level Security — لا مفاتيح سرية في الواجهة أبداً

## 1) إنشاء مشروع Supabase

1. ادخل إلى https://supabase.com وأنشئ حساباً ثم **New project** (يعمل من الهاتف أيضاً).
2. اختر اسماً وكلمة مرور قاعدة البيانات ومنطقة قريبة، وانتظر دقيقة حتى يجهز المشروع.

## 2) تشغيل SQL

من القائمة الجانبية: **SQL Editor → New query** ثم الصق وشغّل بالترتيب:

1. محتوى `supabase/schema.sql` → **Run**
2. محتوى `supabase/storage.sql` → **Run**
3. محتوى `supabase/migrations/0001_multi_tenant.sql` → **Run** (بالترتيب — بعد schema وstorage)
4. محتوى `supabase/migrations/0002_security_hardening.sql` → **Run** (تحصينات العزل/التخزين)
5. محتوى `supabase/migrations/0003_verification_pdf_lockdown.sql` → **Run** (إغلاق تحقق الدومين + بوابة تحميل الكتب)
6. محتوى `supabase/migrations/0004_grants.sql` → **Run** (منح صلاحيات الجداول لـ anon/authenticated — RLS يبقى حارس الصفوف)
6b. (إلزامي لتحقق الدومينات) `supabase functions deploy verify-domain` — التحقق الخادمي الوحيد؛ بدونه تبقى الدومينات `pending`
7. محتوى `supabase/migrations/0005_comments.sql` → **Run** (التعليقات مع المراجعة)
8. محتوى `supabase/migrations/0006_i18n_adsense_seo.sql` → **Run** (جداول الترجمة + إعدادات AdSense/SEO)
8b. محتوى `supabase/migrations/0007_language_backfill_fix.sql` → **Run** (تصحيح backfill للغة الأساسية لجداول profiles و site_settings). **قبل التشغيل**: نفّذ الاستعلامات القرائية في `supabase/diagnostics/0007_preview.sql` لترى الصفوف التي ستتغير. حدّ صادق: قاعدة البيانات لا تسجّل ما إذا كانت `language_code='ar'` قيمة افتراضية لم تُمسّ أم اختياراً متعمداً لمحتوى عربي — الترحيل لا يستطيع التمييز بينهما، ويعتمد أن 'ar' على مستأجر لغته fr/en أرجح أنها الافتراضي. لا تُعِد تشغيل ترحيل مطبَّق أصلاً دون فحص.
8c. محتوى `supabase/migrations/0008_active_tenants_rpc.sql` → **Run** (RPC عام `list_active_tenants()` ليغطي prerender كل المستأجرين النشطين؛ بدونه يعمل prerender على المستأجر الافتراضي فقط)
8d. محتوى `supabase/migrations/0009_public_list_pagination.sql` → **Run** (إضافة `p_offset` اختياري لـ `list_public_posts/books` مع tiebreaker بـ id — paginate ثابت يتجاوز حد 200 لكل طلب؛ التوقيع القديم يبقى يعمل دون تغيير؛ بدونه يكتفي prerender بأول 200 سجل ويحذّر)
9. انشر دوال **Edge Functions** من لوحة Supabase (أو `supabase functions deploy <name>`):
   - `create-client-account` — ينشئ حساب العميل عند إنشاء موقع جديد؛ إن كان البريد مسجلاً مسبقاً يربط الحساب الموجود بالمستأجر الجديد ويحدّث كلمة السر بدل الفشل.
   - `reset-client-password` — يتيح للـSuperadmin إعادة تعيين كلمة سر عميل نسيها (زر 🔑 في قائمة المواقع).
   - `verify-domain` — التحقق الخادمي الوحيد للدومينات؛ بدونه تبقى الدومينات `pending`

> **ملاحظة الـmigrations**: كل ملفات `migrations/*.sql` قابلة لإعادة التشغيل بأمان (`create ... if not exists` / `drop ... if exists` / `create or replace`). إن نفّذتها سابقاً فأعد تشغيل الجديد منها فقط؛ وللتأكد مما طُبّق: `select proname from pg_proc where proname in ('verify_domain_server','get_book_download');` — وجودهما يعني أن 0003 مطبّقة. لا تحذف الـmigrations أي بيانات أو ملفات أو روابط قديمة؛ الملفات غير المُبادئة بـ `tenants/{id}/` تبقى مقروءة للمديرين كما كانت.
3. (اختياري) محتوى `supabase/seed.sql` → **Run** لبيانات تجريبية قابلة للتعديل لاحقاً من لوحة التحكم.

## 3) إنشاء المستخدمين والأدوار (ثلاثة أدوار مختلفة)

النظام فيه جدولان للأدوار، لكلٍّ غرض مختلف — لا تخلط بينهما:

| الدور | الجدول | الغرض | الصلاحيات |
|---|---|---|---|
| **مدير قديم (legacy)** | `public.admin_users` | توافق مع النسخة أحادية الموقع القديمة | إدارة المستأجر الافتراضي فقط (الترحيل 0001 ينسخه تلقائياً كـadmin للمستأجر الافتراضي) — **لا يجعلك Superadmin** |
| **Superadmin (مالك المنصة)** | `public.tenant_members` بـ `role='superadmin'` و`tenant_id IS NULL` | إدارة المنصة كلها | **الوحيد** الذي ينشئ ويدير المستأجرين والدومينات |
| **مدير عميل** | `public.tenant_members` بـ `role='admin'` و`tenant_id` محدد | إدارة موقع عميل واحد | محتوى وإعدادات مستأجره فقط — لا يرى غيره (RLS) |

كل التحققات تتم في قاعدة البيانات عبر `is_superadmin()` / `is_tenant_admin()` (security definer) — لا يمكن للواجهة رفع صلاحيات نفسها.

### أ) إنشاء Superadmin (مالك المنصة)

1. **Authentication → Users → Add user → Create new user** — بريدك + كلمة مرور قوية + **Auto Confirm User**.
2. انسخ **UUID** من جدول المستخدمين، ثم في SQL Editor:

```sql
insert into public.tenant_members (tenant_id, user_id, role)
values (null, 'PASTE-USER-UUID-HERE', 'superadmin');
```

### ب) إنشاء مدير عميل (مربوط بمستأجر واحد)

الأسهل: من لوحة التحكم كـSuperadmin عند إنشاء موقع عميل (حقل البريد + كلمة السر — تُنشأ العضوية تلقائياً عبر Edge Function).
يدوياً، بعد إنشاء المستخدم في Authentication:

```sql
insert into public.tenant_members (tenant_id, user_id, role)
values ('PASTE-TENANT-UUID-HERE', 'PASTE-USER-UUID-HERE', 'admin');
```

### ج) المدير القديم (للموقع الواحد فقط — توافقية)

```sql
insert into public.admin_users (user_id) values ('PASTE-USER-UUID-HERE');
```

⚠️ هذا يمنح إدارة **المستأجر الافتراضي فقط** — لإنشاء المستأجرين استخدم دور Superadmin أعلاه؛ إدراج صف في `admin_users` **لا** ينشئ Superadmin.

## 4) مفاتيح المشروع

**Project Settings → API**:

- انسخ **Project URL** → `VITE_SUPABASE_URL`
- انسخ مفتاح **publishable** (يبدأ بـ `sb_publishable_`) → `VITE_SUPABASE_PUBLISHABLE_KEY` (أو anon القديم → `VITE_SUPABASE_ANON_KEY` — كلاهما مدعوم)

> لا تستخدم مفتاح `service_role` في الواجهة أبداً. مفتاح anon آمن لأن كل الجداول محمية بـ RLS.

## 5) التشغيل محلياً

```bash
cp .env.example .env      # ثم املأ المفتاحين داخل .env
npm install
npm run dev
```

بدون إعداد Supabase يعمل الموقع في **وضع تجريبي** ببيانات عرض فقط (للمعاينة).

## 6) النشر على GitHub Pages

1. أنشئ Repository وارفع الكود.
2. في المستودع: **Settings → Pages → Source: GitHub Actions**.
3. في **Settings → Secrets and variables → Actions → Variables** أضف متغيرين (Variables وليس Secrets — مفتاح anon عام بطبيعته):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (أو `VITE_SUPABASE_ANON_KEY` للمشاريع القديمة)
4. ادفع إلى فرع `main` — سيبني الـ workflow الموجود في `.github/workflows/deploy.yml` وينشر تلقائياً.

الموقع يستخدم `base: './'` و HashRouter لذا يعمل من أي مسار (`user.github.io/repo/`) دون إعدادات إضافية.

## بنية المشروع

```
src/
  components/ (layout, home, blog, books, admin, ui)
  pages/      (public, admin)
  contexts/   (AuthContext, SiteContext)
  i18n/       (ar, en, fr)
  lib/        (supabase, api, markdown, format, demo-data)
  hooks/      (useSEO, useReveal)
  types/
supabase/     (schema.sql, storage.sql, seed.sql, migrations/, functions/verify-domain/)
.github/workflows/deploy.yml
```

## ملاحظات

- رفع الملفات (صور/PDF) يتم إلى Buckets: `profile`, `covers`, `previews` (قراءة عامة، كتابة للمدير فقط) و`books` (خاص — Private). الكتب المجانية تُحمَّل عبر Signed URL قصير المدة يُنشأ عند الضغط على "تحميل الكتاب"، أما كتب PAID/REQUEST فلا يظهر رابط PDF لها أصلاً للزوار.
- عند استبدال ملف قديم (صورة/غلاف/PDF) يُرفع الجديد أولاً ثم يُحذف القديم تلقائياً.
- طلبات الكتب محمية ضد السبام بـ honeypot + تحديد معدل (طلب واحد/دقيقة) + تحقق من المدخلات.
- وضع الصيانة يُفعَّل من Admin → Settings (معطّل افتراضياً).

---

## Multi-Tenant Architecture

المنصة تدعم عدداً غير محدود من المواقع الأكاديمية على نفس التطبيق ونفس مشروع Supabase:

```
المنصة (Superadmin)
 ├── Tenant A (professor-a.com)
 ├── Tenant B (professor-b.com)
 └── Tenant C (#/site/researcher-c على GitHub Pages)
```

- **Superadmin**: عضو `tenant_members` بـ `role='superadmin'` (tenant_id = NULL). يرى `/admin/tenants`، ينشئ/يعلّق/يحذف المواقع، ويدير الدومينات، ويفتح أي موقع للإدارة (سياق "Open Tenant" داخل التطبيق — بدون مشاركة كلمات مرور).
- **Client Admin**: عضو بـ `role='admin'` مرتبط بـtenant واحد. يرى لوحة موقعه فقط. العزل كامل عبر RLS (`is_tenant_admin(tenant_id)`) — إرسال tenant_id لموقع آخر يفشل على مستوى Postgres (WITH CHECK)، وليس في الواجهة فقط.
- **الجداول**: `tenants`, `tenant_members`, `tenant_domains`، وكل جداول المحتوى (`profiles, posts, books, book_requests, site_settings`) تحمل `tenant_id`.
- **القراءات العامة (0002)**: الاستعلام المباشر عبر API يعرض محتوى الـtenant الافتراضي فقط؛ محتوى بقية الـtenants المنشور يُقدَّم حصرياً عبر RPCs (`list_public_posts`, `list_public_books`, `get_public_profile`, `get_public_settings`...) تتحقق في الخادم أن الـtenant بحالة `active` — فلا يمكن تعداد محتوى tenant معلّق/مخفي، ولا قراءة مسوداته.
- **الطلبات**: قاعدة البيانات ترفض أي `book_requests` لا يتطابق فيها `book_id` مع `tenant_id` (أو لكتاب غير منشور/مجاني).
- **تحميل الكتب (0003)**: أهلية التحميل المجاني تُقرَّر في الخادم عبر `get_book_download(tenant, book)` — tenant نشط + الكتاب يتبعه + منشور + FREE، وإلا NULL. ثم سياسة التخزين تفرض تطابق المسار الحرفي عند توقيع URL. كتب PAID/REQUEST لا تُعيد شيئًا للزائر إطلاقًا.
- **Storage**: الملفات الجديدة تحت `tenants/{tenant_id}/...` وسياسات التخزين تمنع الوصول المتقاطع. bucket الكتب يبقى private — توقيع URL لكتب FREE يتطلب تطابق مسار الملف **حرفياً** مع `pdf_url` + انتماء الكتاب للـtenant المُرمَّز في المسار + الكتاب منشور (لا يمكن للزائر توقيع كتب PAID/REQUEST).

### إنشاء أول Superadmin

```sql
insert into public.tenant_members (tenant_id, user_id, role)
values (null, 'YOUR-USER-UUID', 'superadmin');
```

### إضافة عميل جديد

1. Superadmin → `/admin/tenants` → إنشاء موقع أكاديمي (الاسم، slug، بريد العميل).
2. العميل يسجّل حساباً بنفس البريد — trigger يربط عضويته تلقائياً (لا كلمات مرور في قاعدة البيانات، لا service_role).
3. يحصل العميل على Profile وSettings افتراضية جاهزة.

## Custom Domain Setup

1. Superadmin → Tenant → Domains → أضف `client-domain.com`.
2. يظهر سجل DNS المطلوب: `TXT  _academic-verification.client-domain.com  <token>`.
3. العميل يضيفه لدى مزود DNS ثم يضغط **تحقق**. التحقق مسار **واحد موثوق** (0003): انشر Edge Function المرفقة أولاً: `supabase functions deploy verify-domain` — تُوثّق المستخدم من جلسته الحقيقية، تتحقق من عضويته في tenant الدومين **من الخادم**، تستعلم DNS TXT عبر `Deno.resolveDns` من الخادم، وتشترط **تطابقًا حرفيًا كاملاً** بين السجل والتوكن، ثم تستدعي `verify_domain_server` — دالة **مُسحوبة التنفيذ من PUBLIC/anon/authenticated** ومتاحة حصرياً لـ `service_role` (مفتاح موجود فقط في بيئة الـ Edge Function، ولا يوجد في المستودع ولا في الواجهة إطلاقاً). إن لم تكن الـFunction منشورة أو تعذّر الوصول إليها: يفشل التحقق ويبقى الدومين `pending` — **لا يوجد أي بديل من المتصفح**. قيود DB تمنع `active` قبل `verified_at`.
4. فعّل الدومين (Active) وعيّنه Primary (مؤشر فريد في قاعدة البيانات يضمن primary واحداً فقط لكل tenant).
5. أضف الدومين في GitHub Pages: Settings → Pages → Custom domain (وإلا فلن يقدّم GitHub الموقع على هذا النطاق حتى لو كان موثقاً).
6. عند زيارة `client-domain.com` يتعرف التطبيق على الـtenant من `window.location.hostname` عبر `resolve_tenant_by_hostname` ويعرض محتواه فقط. دومين pending/disabled يعرض صفحة "الموقع غير متاح".

> ملاحظة صادقة: تسجيل الدومين في قاعدة البيانات وحده لا يجعل النطاق يعمل — يلزم DNS (CNAME/A) + إعداد GitHub Pages.


---

## إدارة المحتوى متعدد اللغات (ar / fr / en)

- **المحتوى الأساسي** يبقى في الجداول الحالية (`posts`, `books`, `profiles`, `site_settings`) بلغة الموقع الأساسية (`language_code`).
- **الترجمات المستقلة** في جداول جديدة: `post_translations`, `book_translations`, `profile_translations`, `site_settings_translations` — سجل مستقل لكل لغة (عنوان، slug، محتوى، SEO، حالة نشر)، مع `unique(post_id, language_code)` وحارس يمنع ربط ترجمة بمستأجر آخر.
- **لا نسخ تلقائي ولا حذف**: التبديل بين اللغات في المحرر يحمّل محتوى تلك اللغة فقط؛ اللغة بلا محتوى تظهر حقولاً فارغة صراحةً. زر «نسخ المحتوى من لغة أخرى» يعمل فقط بنقرة صريحة ويبقى قابلاً للتعديل المستقل.
- مقال قد يوجد بالعربية فقط أو الفرنسية فقط أو أي تركيبة — لا إلزام بالترجمة.
- **الزائر**: القوائم تعرض فقط المحتوى المتوفر بلغته؛ الصفحة غير المترجمة تعرض النسخة الأصلية مع **تنبيه صريح** بأنها ليست باللغة المختارة (لا تمويه). `hreflang` يُنشأ فقط للترجمات الموجودة فعلاً، ولا تُنشأ روابط لغات وهمية.
- **المحتوى الموجود سابقاً** يُصنّف تلقائياً كلغة المستأجر الأساسية عبر backfill في 0006 — لا يُفقد أي محتوى.

## Google AdSense (اختياري لكل موقع)

- من **لوحة التحكم ← الإعدادات ← تحقيق الدخل**: تفعيل + Publisher ID (`ca-pub-…`, مُتحقق من الصيغة) + Auto Ads.
- السكربت يُحمَّل **فقط** إذا: التفعيل مفعّل + المعرف صالح + المستأجر محلول على هذا الدومين — وفي الصفحات العامة فقط (أبداً في لوحة التحكم أو الدخول)، وبدون تكرار، وفشل تحميله لا يعطّل الموقع.
- **المعرف قيمة عامة** (يظهر في مصدر الصفحة بطبيعته) وليس سراً؛ لا يُقبل أي كود JavaScript من العميل — الرقم فقط.
- **الفارق المهم**: إضافة السكربت ≠ إثبات الملكية ≠ الموافقة ≠ عرض الإعلانات ≠ `ads.txt`. الموافقة تتم من لوحة Google AdSense فقط، وإدخال المعرف هنا لا يعني أي موافقة.

### ads.txt والدومينات — حدود الاستضافة (بوضوح)

GitHub Pages يخدم هذا المستودع على **دومين واحد** (`username.github.io`) — لا يمكن لملف `ads.txt` ثابت واحد أن يختلف لكل دومين مخصص. الخيارات الواقعية:

1. **الدومين الافتراضي**: ضع سطر `google.com, pub-XXXX, DIRECT, f08c47fec0942fa0` في `public/ads.txt` قبل النشر (للموقع الافتراضي فقط).
2. **دومين مخصص لمستأجر**: إما نشر مستقل (مستودع خاص به) أو طبقة proxy/edge أمام GitHub Pages تقدّم `/ads.txt` خاصاً بالدومين — غير متوفر في GitHub Pages الصِرف.
3. لا نستخدم redirects لأن Google قد لا يقبلها للتحقق من ads.txt على كل الحالات.

نفس الحد ينطبق على `sitemap.xml` لكل دومين مخصص — يولَّد تلقائياً للدومين الافتراضي في CI (خطوة Generate sitemap في workflow).

## SEO التقني

- عنوان/وصف/canonical/OG/Twitter لكل صفحة + `og:locale` حسب اللغة + `robots` (العامة `index,follow` — لوحة التحكم والدخول `noindex,nofollow`).
- JSON-LD حقيقي من قاعدة البيانات فقط: `WebSite` و`Person` في الرئيسية، `BlogPosting` + `BreadcrumbList` للتدوينات، `Book` للكتب — بلا تقييمات أو جوائز م fabricated.
- **روابط اللغات**: كل نسخة لغوية منشورة لها slug خاص ورابط خاص `#/blog/<slug>?lang=<l>` يختار اللغة فعلياً (الـLangProvider يقرأ المعامل من الـhash عند التحميل وعند التنقل)، والاختيار محفوظ عبر التنقل. canonical يطابق النسخة المعروضة، وhreflang يُنشأ فقط للترجمات المنشورة الموجودة بروابطها الحقيقية — لا روابط وهمية للغات ناقصة.
- **قابلية الأرشفة (مهم)**: روابط `#/...` كلها مستند SPA واحد ولا تُفهرَس كصفحات مستقلة بشكل موثوق. لذلك يولّد `scripts/prerender.mjs` في CI صفحات HTML ثابتة حقيقية لكل نسخة لغوية منشورة، و`sitemap.xml` يتولد من هذه الملفات الفعلية فقط عبر `scripts/build-sitemap.mjs`. بدون `SITE_BASE_URL` لا يُكتب أي رابط بدومين placeholder — يبقى الهيكل الفارغ.
- **بنية SEO متعددة المستأجرين (الفعلية)**: هذا النشر يخدم كل المستأجرين النشطين من **نفس المضيف** (GitHub Pages). المولّد يمرّ على كل المستأجرين النشطين عبر RPC عام `list_active_tenants()` (الترحيل 0008) ويولّد:
  - المستأجر الافتراضي: `/p/blog/<lang>/<slug>/` و`/p/books/<lang>/<slug>/`
  - بقية المستأجرين: `/p/t/<tenant-slug>/blog/<lang>/<slug>/` (نفس المضيف — روابط حقيقية قابلة للخدمة فعلاً)
  - canonical يشير دائماً إلى مسارات هذا المضيف فقط؛ لا توليد لأي canonical على دومين مخصص لا يخدمه هذا النشر. عزل المحتوى محفوظ: كل صفحة تُبنى من محتوى مستأجرها المنشور فقط (RPCs العامة + RLS). روابط "فتح الموقع التفاعلي" داخل الصفحات الثابتة لمستأجر غير افتراضي تمر عبر `/#/site/<slug>`.
  - إن لم يكن 0008 مطبّقاً بعد، يرجع المولّد تلقائياً إلى `default_tenant_id()` (المستأجر الافتراضي فقط) دون كسر البناء.
  - **حدود الدومينات المخصصة**: GitHub Pages يخدم دوميناً واحداً لهذا النشر — لا ادّعاء أن الـsitemap أو الصفحات الثابتة أو canonical تغطي دومينات لا يخدمها هذا النشر. SEO كامل لدومين مخصص يتطلب نشراً مستقلاً لكل دومين (أو proxy أمام النشر).
- `robots.txt` يسمح بالأرشفة ويشير إلى الـsitemap — وهو ليس بديلاً عن الحماية (RLS يحمي البيانات).
- التحقق من Search Console: الصق رمز التحقق في الإعدادات ← يُضاف كوسم `google-site-verification` في الصفحات العامة (رمز مُنقّى، بلا HTML).
- لا يوجد أي تطبيق يضمن ترتيباً في Google — هذا تحسين تقني لقابلية الأرشفة فقط.

## الاختبارات

- `npm run test` — اختبارات Node مدمجة (محاكاة، بلا قاعدة بيانات): pagination لـ250+250 سجلاً بلا تكرار، فشل طلبات الترجمة يُسقط المستأجر ويفشل البناء، التغطية المنقوصة عند غياب 0006/0008، canonical/hreflang/الاتجاه، تغطية sitemap، ومنطق AdSense (تفعيل/إطفاء/معرّفات غير صالحة).
- `npm run test:sql` — اختبارات **PostgreSQL حقيقية** (ليست محاكاة) على قاعدة مؤقتة محلية يُنشئها ويحذفها السكربت: تفرّد overload بعد 0009، الاستدعاء القديم بثلاثة معاملات، دفعات 200+60 متمايزة، الحد 200، استبعاد المسودات، عزل المستأجرين، الصلاحيات. يتطلب PostgreSQL محلياً — **لا يلمس الإنتاج أبداً**.

## متغيرات البيئة

- `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY` (أو `VITE_SUPABASE_ANON_KEY`) — قيم **عامة** تُضمَّن في الحزمة؛ تكفي GitHub Variables.
- `SITE_BASE_URL` (اختياري) — الدومين العام لتوليد canonical/sitemap صحيحين في CI.
- مفاتيح `service_role` **لا تدخل الواجهة أبداً** — تُستخدم فقط داخل Edge Functions.
