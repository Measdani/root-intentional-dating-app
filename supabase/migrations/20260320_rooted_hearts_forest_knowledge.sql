begin;

create table if not exists public.rh_forest_knowledge (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  topic text not null,
  content text not null,
  action_text text,
  keywords text[] not null default '{}'::text[],
  starter_label text,
  starter_prompt text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rh_forest_knowledge_active_order
  on public.rh_forest_knowledge(is_active, display_order, topic);

alter table public.rh_forest_knowledge enable row level security;

drop policy if exists rh_forest_knowledge_public_select on public.rh_forest_knowledge;
create policy rh_forest_knowledge_public_select
on public.rh_forest_knowledge
for select
using (true);

drop policy if exists rh_forest_knowledge_admin_write on public.rh_forest_knowledge;
create policy rh_forest_knowledge_admin_write
on public.rh_forest_knowledge
for all
using (public.rh_is_admin())
with check (public.rh_is_admin());

drop trigger if exists trg_rh_forest_knowledge_updated_at on public.rh_forest_knowledge;
create trigger trg_rh_forest_knowledge_updated_at
before update on public.rh_forest_knowledge
for each row execute function public.rh_set_updated_at();

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
    'covenant-vs-contract',
    'Layer 1: The Standard',
    'Covenant vs. Contract',
    'A contract is about protection; a Covenant is about promise. In Layer 1, the Standard is not just a list of traits, but a spiritual alignment. If a partner seeks a contract, they seek an exit. If they seek a Covenant, they seek a Foundation.',
    'Watch whether they are building toward promise or only negotiating for comfort and escape. Do not hand covenant access to contract behavior.',
    array['marriage', 'commitment', 'standard', 'promise'],
    'Covenant vs. Contract',
    'How do I tell if someone wants a Covenant or just a contract?',
    10
  ),
  (
    'counterfeit-and-mask',
    'Layer 2: The Detox',
    'The Counterfeit and the Mask',
    'The Enemy sends a 90% match to distract from the 100% promise. A Counterfeit mimics the walk and talk but fails the consistency test. Watch for ''Sewing'' (unearned gifts/money) used to create an early soul tie agreement.',
    'Do not explain away the mask. Watch consistency longer than chemistry and let what''s false fall on its own.',
    array['red flags', 'fake', 'gifts', 'money', 'mask', 'counterfeit'],
    'Spot the Counterfeit',
    'How do I identify a Counterfeit before I get attached?',
    20
  ),
  (
    'gaslighting-and-reality-distortion',
    'Layer 2: The Detox',
    'Gaslighting and Reality Distortion',
    'Gaslighting is not confusion by accident. It is repeated distortion that makes you question what you saw, heard, felt, or remembered. If a connection keeps pulling you away from clarity and peace, that is not Alignment. Truth produces steadiness; manipulation produces disorientation.',
    'Do not argue with the distortion. Slow the connection down, document the pattern, and trust the difference between peace and confusion.',
    array['gaslighting', 'gaslight', 'confusion', 'manipulation', 'control', 'distortion', 'lies'],
    'Gaslighting',
    'How do I recognize gaslighting early?',
    30
  ),
  (
    'pressure-control-false-peace',
    'Layer 2: The Detox',
    'Pressure, Control, and False Peace',
    'False peace is when you stay quiet just to avoid their reaction. Control tries to train your nervous system to submit through pressure, guilt, fear, or emotional punishment. Alignment never requires you to betray your own discernment to keep someone comfortable.',
    'If peace only exists when you stay small, that is not peace. Step back from pressure and let their pattern reveal itself without your self-betrayal.',
    array['pressure', 'control', 'fear', 'guilt', 'walking on eggshells', 'punishment', 'submission'],
    null,
    null,
    40
  ),
  (
    'lovebombing-and-acceleration',
    'Layer 2: The Detox',
    'Lovebombing and Acceleration',
    'Anything that tries to force emotional agreement before consistency has been proven is acceleration, not Alignment. Lovebombing uses intensity, praise, gifts, urgency, or spiritual language to create attachment faster than truth has been tested.',
    'Refuse urgency. Let time, consistency, and peace do the testing before deeper access is given.',
    array['lovebombing', 'love bombing', 'rush', 'rushing', 'intensity', 'urgency', 'fast', 'too much too soon'],
    null,
    null,
    50
  ),
  (
    'spirit-vs-flesh',
    'Layer 3: Self-Awareness',
    'Spirit vs. Flesh',
    'The Flesh is impulsive and loud; the Spirit is steady and quiet. High chemistry is often the Flesh reacting to a familiar toxic pattern. Peace is the indicator of the Spirit. If there is no peace, there is no Alignment.',
    'Ask what is leading: peace or urgency. If peace is missing, slow down until discernment returns.',
    array['impulse', 'chemistry', 'peace', 'attraction', 'fighting'],
    'Spirit vs. Flesh',
    'How do I tell whether this chemistry is Spirit or Flesh?',
    60
  ),
  (
    'peace-pattern-discernment',
    'Layer 3: Self-Awareness',
    'Peace, Pattern, and Discernment',
    'Discernment does not judge by intensity first; it watches pattern. One strong moment proves little. Repeated clarity, consistency, and peace reveal more than chemistry ever will. If a person leaves you anxious, foggy, or self-betraying, slow down until the pattern speaks.',
    'Let pattern outrank intensity. If the connection keeps producing anxiety or fog, create space until clarity returns.',
    array['discernment', 'pattern', 'clarity', 'consistency', 'anxious', 'foggy', 'peace'],
    null,
    null,
    70
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
