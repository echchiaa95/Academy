-- =============================================================
-- OPTIONAL demo data. Run AFTER schema.sql if you want to try
-- the site immediately. Everything is editable from /admin.
-- =============================================================

insert into public.profiles (
  first_name, last_name, academic_title, specialty, field, institution, location,
  short_bio, long_bio, email, google_scholar, orcid, researchgate, linkedin,
  qualifications, interests
)
select
  'Ahmed', 'Example', 'Professor of Philosophy', 'Contemporary Philosophy & Ethics',
  'Humanities', 'Example University', 'Cairo, Egypt',
  'Researcher and writer interested in ethics, hermeneutics, and the philosophy of culture.',
  E'Dr. Ahmed Example is a professor of philosophy whose work focuses on contemporary ethics, hermeneutics, and the philosophy of culture.\n\nHis teaching covers modern philosophy, ethics, and research methodology.',
  'ahmed.example@university.edu',
  'https://scholar.google.com', 'https://orcid.org/0000-0000-0000-0000',
  'https://www.researchgate.net', 'https://www.linkedin.com',
  array['PhD in Philosophy — Example University (2008)','MA in Ethics (2003)'],
  array['Contemporary Ethics','Hermeneutics','Philosophy of Culture','Digital Humanities']
where not exists (select 1 from public.profiles);

insert into public.posts (title, slug, excerpt, content, category, tags, published, featured, published_at)
values
('On the Ethics of Reading', 'ethics-of-reading',
 'What does it mean to read responsibly? Notes on attention and intellectual honesty.',
 E'## Why reading is an ethical act\n\nReading is never neutral.\n\n> "The reader completes the work in the same gesture."\n\n- it restores depth\n- it trains judgement\n\n**Interpretation** begins where *haste* ends.',
 'Philosophy', array['ethics','reading'], true, true, now() - interval '3 days'),
('Hermeneutics in the Digital Age', 'hermeneutics-digital-age',
 'Can classical methods of interpretation survive the feed?',
 E'## The feed and the text\n\n1. Context before judgement\n2. Charity before critique\n3. Slowness before sharing',
 'Research', array['hermeneutics','digital'], true, true, now() - interval '12 days'),
('Notes on Academic Writing', 'notes-academic-writing',
 'Clarity is a moral duty.',
 E'## Write to be understood\n\n- One idea per paragraph\n- Verbs over nouns\n\n> Style is the morality of thought.',
 'Writing', array['writing','method'], true, true, now() - interval '25 days'),
('The Public Role of the Professor', 'public-role-professor',
 'Between the lecture hall and the public square.',
 E'## Beyond the ivory tower\n\nKnowledge is a public trust.',
 'Philosophy', array['public','university'], true, false, now() - interval '40 days')
on conflict (slug) do nothing;

insert into public.books (title, slug, description, author, year, pages, price, currency, type, published, featured, featured_order)
values
('Introduction to Contemporary Ethics', 'intro-contemporary-ethics',
 'A clear introduction to the main currents of contemporary ethical thought.',
 'Dr. Ahmed Example', 2023, 284, 0, 'USD', 'FREE', true, true, 1),
('Hermeneutics: Understanding and Interpretation', 'hermeneutics-understanding',
 'A monograph on the theory of interpretation from Schleiermacher to Ricoeur.',
 'Dr. Ahmed Example', 2021, 342, 24, 'USD', 'PAID', true, true, 2),
('Essays on the Philosophy of Culture', 'essays-philosophy-culture',
 'Collected essays on culture, memory, and modernity. Print on request.',
 'Dr. Ahmed Example', 2019, 210, null, 'USD', 'REQUEST', true, false, 3)
on conflict (slug) do nothing;

-- =============================================================
-- Create the admin: after you sign up a user in
-- Authentication > Users, copy their UUID and run:
--
--   insert into public.admin_users (user_id) values ('PASTE-USER-UUID-HERE');
--
-- =============================================================
