begin;

insert into public.rh_forest_knowledge (
  slug,
  category,
  topic,
  content,
  action_text,
  keywords,
  starter_label,
  starter_prompt,
  display_order
)
values
  (
    'oak-the-courage-dater',
    'Assessment Styles',
    'Oak: The Courage Dater',
    'Oak energy is not about being hard or emotionally shut down. An Oak is grounded, values honesty, stands firmly in truth, and prefers to address issues clearly rather than avoid them. In the assessment, Oak answers point toward calm directness, accountability, strong values, and the courage to repair conflict instead of running from it. If that is your repeated pattern under pressure, Oak may be your primary style.',
    'Do not decide by mood alone. Look at your pattern under pressure: how you handle emotions, boundaries, truth, and repair.',
    array['oak', 'am i an oak', 'what is an oak', 'courage dater', 'assessment style', 'direct communication', 'honesty'],
    'Am I an Oak?',
    'How do I know if I am an Oak?',
    80
  ),
  (
    'what-love-is',
    'Layer 1: The Standard',
    'What Love Is',
    'At Rooted Hearts, love is not just a feeling and it is not intensity. Love is practice, consistency, truth, safety, respect, and repair. Healthy love honors boundaries, tells the truth, remains steady when emotions rise, and keeps choosing care through action. If something feels intense but does not produce consistency, honesty, or safety, that may be attachment or urgency, but it is not mature love yet.',
    'Measure love by consistency, respect, and repair over time, not by chemistry or emotional rush alone.',
    array['love', 'what is love', 'whats love', 'healthy love', 'real love', 'love is a practice', 'consistency', 'boundaries'],
    'What Is Love?',
    'What is love according to Rooted Hearts?',
    90
  ),
  (
    'how-healthy-partners-handle-arguments',
    'Conflict & Repair',
    'How Healthy Partners Handle Arguments',
    'Conflict itself is not the problem. Healthy partners do not measure success by avoiding arguments or by winning them. They tell the truth, regulate themselves, listen for what matters underneath the disagreement, and repair after rupture. The couples who stay together are not those who never argue; they are those who repair clearly, respectfully, and consistently. Healthy conflict builds understanding instead of breaking safety.',
    'When conflict starts, slow down, speak honestly without trying to dominate, and end with a clear repair step or agreement.',
    array['argue', 'arguing', 'arguments', 'fight', 'fighting', 'conflict', 'repair', 'disagreement', 'how do we argue', 'how to argue'],
    'Healthy Arguments',
    'How should healthy couples argue?',
    100
  )
on conflict (slug) do update
set
  category = excluded.category,
  topic = excluded.topic,
  content = excluded.content,
  action_text = excluded.action_text,
  keywords = excluded.keywords,
  starter_label = excluded.starter_label,
  starter_prompt = excluded.starter_prompt,
  display_order = excluded.display_order,
  is_active = true;

commit;
