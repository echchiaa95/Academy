# Custom Domain Router — دليل النشر اليدوي / Manual deployment guide

طبقة التوجيه للدومينات الخاصة بالعملاء. التطبيق نفسه يبقى على GitHub Pages —
هذا الـ Worker لا يستضيف شيئًا، فقط يوجّه أسماء النطاقات الموثّقة إلى التطبيق.

## لماذا هذا ضروري؟

GitHub Pages يدعم دومينًا مخصصًا **واحدًا** لكل نشر. لا يمكنه توجيه عدد غير
محدود من دومينات العملاء إلى مستأجرين مختلفين. Cloudflare Workers توفر ذلك
عبر ميزة **Custom Hostnames (SSL for SaaS)**.

## المتطلبات (يدوية، خارج المستودع)

1. حساب Cloudflare (المنصة تملكه، ليس العميل).
2. دومين تشغيل للمنصة مضاف إلى Cloudflare (مثال: `academic-profile.app`) —
   يستخدم كـ fallback zone لميزة Custom Hostnames.
3. تفعيل **SSL for SaaS** (Custom Hostnames): أول 100 hostname مجانية،
   بعدها ~0.10$/شهر لكل hostname.
4. `npm i -g wrangler && wrangler login`

## خطوات النشر

```bash
cd workers/custom-domain-router
wrangler secret put SUPABASE_ANON_KEY   # الصق مفتاح anon/publishable فقط — أبدًا service_role
wrangler deploy
```

ثم في لوحة Cloudflare (الـ zone الخاصة بالمنصة):

1. **SSL/TLS → Custom Hostnames → Add Custom Hostname** لكل دومين عميل
   (أو عبر API). يمكن ربط إنشاء الـ hostname باعتماد الدومين في لوحة
   Superadmin لاحقًا عبر Cloudflare API.
2. أخبر العميل بإضافة سجل **CNAME** من دومينه إلى:
   `custom-hostname.<platform-zone>` (القيمة الدقيقة تظهر في لوحة Cloudflare).
3. بعد ظهور حالة الـ hostname كـ Active في Cloudflare (شهادة HTTPS صدرت)،
   فعّل الدومين من لوحة Superadmin (TenantDomains → Activate).

## مسؤولية العميل (تظهر أيضًا في لوحته)

- يشتري الدومين ويملكه ويدفع للمسجّل مباشرة.
- يضيف سجل TXT للتحقق من الملكية: `_academic-verification.<domain>` = الرمز الظاهر في لوحته.
- يضيف سجل CNAME عندما يزوّده المشرف بالهدف.
- لا يشارك بيانات دخوله للمسجّل مع أحد.

## التحقق بعد النشر

```bash
curl -I https://<customer-domain>/__router-health   # يجب أن يرد "ok"
curl -s https://<customer-domain>/ | grep -o 'app-version="[^"]*"'
```

فتح الدومين في المتصفح يجب أن يعرض موقع العميل الصحيح (يحلّه التطبيق عبر
`resolve_tenant_by_hostname`). دومين غير مسجّل يحوَّل إلى صفحة المنصة،
ودومين غير مفعّل يرد 503 — لا يُعرض أي محتوى خاطئ إطلاقًا.
