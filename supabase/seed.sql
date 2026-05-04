-- Seed inicial — módulo English
-- Correr en Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Detecta automáticamente tu user_id. Idempotente (ON CONFLICT DO NOTHING).

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No user found in auth.users. Log in first.';
  END IF;

  -- -----------------------------------------------------------------------
  -- Decks (5 categorías predefinidas)
  -- -----------------------------------------------------------------------
  INSERT INTO decks (user_id, name, category, description) VALUES
    (uid, 'Core Vocabulary',  'vocab',       'Essential everyday English words'),
    (uid, 'Phrasal Verbs',    'phrasal',     'High-frequency verb + particle combos'),
    (uid, 'Idioms',           'idioms',      'Fixed expressions with non-literal meaning'),
    (uid, 'Book Quotes',      'book-quotes', 'Memorable lines worth reviewing'),
    (uid, 'Tech Notes',       'tech-notes',  'Engineering and computer-science terminology')
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- Vocab entries
  -- -----------------------------------------------------------------------

  -- Words
  INSERT INTO vocab_entries (user_id, kind, term, meaning, example, tags) VALUES
    (uid, 'word', 'sophisticated',  'Having a refined understanding or complexity',
     'Her sophisticated argument left the audience speechless.',
     ARRAY['adjective','formal']),
    (uid, 'word', 'mundane',        'Lacking excitement; ordinary',
     'Even mundane tasks feel meaningful when done with intention.',
     ARRAY['adjective','neutral']),
    (uid, 'word', 'eloquent',       'Fluent and persuasive in speech or writing',
     'He gave an eloquent speech that moved everyone in the room.',
     ARRAY['adjective','formal']),
    (uid, 'word', 'tenacious',      'Holding firmly to a goal; persistent',
     'She was tenacious in pursuing her research despite setbacks.',
     ARRAY['adjective','positive']),
    (uid, 'word', 'concise',        'Giving much information clearly and briefly',
     'A concise summary saves the reader time.',
     ARRAY['adjective','writing']),
    (uid, 'word', 'ambiguous',      'Open to more than one interpretation',
     'The contract contained several ambiguous clauses.',
     ARRAY['adjective','neutral']),
    (uid, 'word', 'meticulous',     'Showing great attention to detail',
     'The editor was meticulous about punctuation.',
     ARRAY['adjective','positive']),
    (uid, 'word', 'candid',         'Truthful and straightforward; frank',
     'I appreciate your candid feedback on my writing.',
     ARRAY['adjective','neutral']),
    (uid, 'word', 'pivotal',        'Of crucial importance in relation to the development of something',
     'The 1990s were a pivotal decade for the internet.',
     ARRAY['adjective','formal']),
    (uid, 'word', 'nuanced',        'Characterized by subtle distinctions',
     'His analysis was nuanced and avoided oversimplification.',
     ARRAY['adjective','academic'])
  ON CONFLICT DO NOTHING;

  -- Phrases
  INSERT INTO vocab_entries (user_id, kind, term, meaning, example, tags) VALUES
    (uid, 'phrase', 'get the ball rolling',  'To start an activity or process',
     'Let''s get the ball rolling on the new project.',
     ARRAY['idiom','casual']),
    (uid, 'phrase', 'bite the bullet',       'To endure a painful situation with courage',
     'I had to bite the bullet and rewrite the entire module.',
     ARRAY['idiom','casual']),
    (uid, 'phrase', 'on the fence',          'Undecided between two options',
     'I''m still on the fence about switching frameworks.',
     ARRAY['idiom','casual']),
    (uid, 'phrase', 'cut corners',           'To do something in a way that saves time or money but produces inferior results',
     'Don''t cut corners with security reviews.',
     ARRAY['idiom','neutral']),
    (uid, 'phrase', 'get your feet wet',     'To begin to participate in an activity for the first time',
     'Contributing to open source is a great way to get your feet wet.',
     ARRAY['idiom','casual']),
    (uid, 'phrase', 'bear in mind',          'To remember or consider something',
     'Bear in mind that the API has a rate limit.',
     ARRAY['phrase','neutral']),
    (uid, 'phrase', 'at the end of the day', 'When everything is considered; ultimately',
     'At the end of the day, user experience matters most.',
     ARRAY['phrase','casual']),
    (uid, 'phrase', 'hit the nail on the head', 'To describe exactly what is causing a situation or problem',
     'You hit the nail on the head with that refactor suggestion.',
     ARRAY['idiom','casual'])
  ON CONFLICT DO NOTHING;

  -- Connectors
  INSERT INTO vocab_entries (user_id, kind, term, meaning, example, tags) VALUES
    (uid, 'connector', 'however',       'Used to introduce a contrast',
     'The feature works well; however, it slows down on large datasets.',
     ARRAY['contrast','neutral']),
    (uid, 'connector', 'furthermore',   'Used to add more information that supports the argument',
     'The solution is efficient; furthermore, it requires no extra dependencies.',
     ARRAY['addition','formal']),
    (uid, 'connector', 'nonetheless',   'In spite of that; nevertheless',
     'The task was complex; nonetheless, the team delivered on time.',
     ARRAY['contrast','formal']),
    (uid, 'connector', 'whereas',       'In contrast or comparison with the fact that',
     'Python is great for scripting, whereas Go excels at concurrency.',
     ARRAY['contrast','neutral']),
    (uid, 'connector', 'consequently',  'As a result; therefore',
     'The tests were failing; consequently, the deploy was blocked.',
     ARRAY['cause-effect','neutral']),
    (uid, 'connector', 'albeit',        'Although; even though (formal concession)',
     'It was a useful library, albeit with a steep learning curve.',
     ARRAY['concession','formal']),
    (uid, 'connector', 'in contrast',   'Used to show a clear difference',
     'Arrays are mutable; in contrast, tuples are fixed.',
     ARRAY['contrast','neutral']),
    (uid, 'connector', 'to sum up',     'Used to introduce a summary of what has been said',
     'To sum up, prefer composition over inheritance.',
     ARRAY['summary','neutral'])
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed complete for user %', uid;
END $$;
