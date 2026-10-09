-- Editorial session fields and deterministic Akhdari ordering.
-- The official CSV `numero` column is encoded by the ordered video_id array below.
-- This migration is additive: it never recreates a session or changes a legacy UUID.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS source_title text,
  ADD COLUMN IF NOT EXISTS learning_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reflection_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_learning_points_array_check,
  ADD CONSTRAINT sessions_learning_points_array_check
    CHECK (jsonb_typeof(learning_points) = 'array'),
  DROP CONSTRAINT IF EXISTS sessions_reflection_questions_array_check,
  ADD CONSTRAINT sessions_reflection_questions_array_check
    CHECK (jsonb_typeof(reflection_questions) = 'array');

DO $preflight$
DECLARE
  v_source_count integer;
  v_match_count integer;
  v_session_count integer;
BEGIN
  WITH source AS (
    SELECT ordinality::integer AS canonical_number, video_id
    FROM unnest(ARRAY[
      'fRz9_8mDKyI','RX3fXIUVbmg','J2XxVM6nx4I','BI7TSdFwzhg','AmljoJEAjuE',
      'tlcqA7snWUc','TKO0w9XUPP0','Pe3fByYib_w','QjWiX-3q9NI','jHH57WBluhU',
      'jFUBqGtIHpo','6fXtoq6kT5Q','apbDMm39dCU','h9AvZkTX9Y8','Bw_IGc96zbw',
      '3mRTISxe4j8','-SCeQR_dRYQ','a7KFQimSPsE','jOqQgY4gPp4','YHdEC8ZJZIE',
      'VkorHYMSWYg','GyVigdek_RE','fDpzSd4Y0rA','T2_rfSiNeGs','TXQ0sFI12uI',
      'n3QPjwP_tDc','ymgVzW_hkbg','s_p5iMM5DIc','Amd5uh9-VGc','b7AcCAb0OOo',
      'RPbYMeV08Xg','Wx_ACU4Izcs','rESA99S4Q5U','zZ8AsCYpLYA','_fuT5qtO_g8',
      'fRg8WErUo0A','kxKX4iWcong','7sWbe88NQmI','z4yzSBLD6G0','vfH3sOs8Ohw',
      '0gR8SZpJNAA','ZoKziQ_jBns','q7dO_bDoASM','cXYWUw2Fz9A','2W8V06btdz4',
      '0SmNVzw-HZU','nn5KrPcke_E','aA9z8Es3mA8','ZjU3aMzUupA','_lRH2SDY-0I',
      'felXyunjPNM','e3LD1-jAx_c','eva981HsIpU','Vgmj-7lrops','t8u3aFciO4k',
      'qHTj_G9hl9k','XFsK9x4R-4g'
    ]::text[]) WITH ORDINALITY AS item(video_id, ordinality)
  ), matches AS (
    SELECT source.canonical_number, source.video_id, session.id AS session_id
    FROM source
    JOIN public.lesson_resources AS resource
      ON resource.resource_type = 'youtube'
     AND CASE
       WHEN resource.external_url LIKE '%youtu.be/%'
         THEN split_part(split_part(resource.external_url, 'youtu.be/', 2), '?', 1)
       ELSE split_part(split_part(resource.external_url, 'v=', 2), '&', 1)
     END = source.video_id
    JOIN public.sessions AS session ON session.id = resource.session_id
    JOIN public.lessons AS lesson ON lesson.id = session.lesson_id
    JOIN public.chapters AS chapter ON chapter.id = lesson.chapter_id
    JOIN public.books AS book ON book.id = chapter.book_id
    WHERE book.title = 'Mukhtasar Al-Akhdari'
  )
  SELECT
    (SELECT count(*) FROM source),
    count(*),
    count(DISTINCT session_id)
  INTO v_source_count, v_match_count, v_session_count
  FROM matches;

  IF v_source_count <> 57 OR v_match_count <> 57 OR v_session_count <> 57 THEN
    RAISE EXCEPTION
      'Akhdari editorial preflight failed: source %, matches %, sessions %',
      v_source_count, v_match_count, v_session_count;
  END IF;
END
$preflight$;

WITH source AS (
  SELECT ordinality::integer AS canonical_number, video_id
  FROM unnest(ARRAY[
    'fRz9_8mDKyI','RX3fXIUVbmg','J2XxVM6nx4I','BI7TSdFwzhg','AmljoJEAjuE',
    'tlcqA7snWUc','TKO0w9XUPP0','Pe3fByYib_w','QjWiX-3q9NI','jHH57WBluhU',
    'jFUBqGtIHpo','6fXtoq6kT5Q','apbDMm39dCU','h9AvZkTX9Y8','Bw_IGc96zbw',
    '3mRTISxe4j8','-SCeQR_dRYQ','a7KFQimSPsE','jOqQgY4gPp4','YHdEC8ZJZIE',
    'VkorHYMSWYg','GyVigdek_RE','fDpzSd4Y0rA','T2_rfSiNeGs','TXQ0sFI12uI',
    'n3QPjwP_tDc','ymgVzW_hkbg','s_p5iMM5DIc','Amd5uh9-VGc','b7AcCAb0OOo',
    'RPbYMeV08Xg','Wx_ACU4Izcs','rESA99S4Q5U','zZ8AsCYpLYA','_fuT5qtO_g8',
    'fRg8WErUo0A','kxKX4iWcong','7sWbe88NQmI','z4yzSBLD6G0','vfH3sOs8Ohw',
    '0gR8SZpJNAA','ZoKziQ_jBns','q7dO_bDoASM','cXYWUw2Fz9A','2W8V06btdz4',
    '0SmNVzw-HZU','nn5KrPcke_E','aA9z8Es3mA8','ZjU3aMzUupA','_lRH2SDY-0I',
    'felXyunjPNM','e3LD1-jAx_c','eva981HsIpU','Vgmj-7lrops','t8u3aFciO4k',
    'qHTj_G9hl9k','XFsK9x4R-4g'
  ]::text[]) WITH ORDINALITY AS item(video_id, ordinality)
), matches AS (
  SELECT source.canonical_number, source.video_id, session.id AS session_id
  FROM source
  JOIN public.lesson_resources AS resource
    ON resource.resource_type = 'youtube'
   AND CASE
     WHEN resource.external_url LIKE '%youtu.be/%'
       THEN split_part(split_part(resource.external_url, 'youtu.be/', 2), '?', 1)
     ELSE split_part(split_part(resource.external_url, 'v=', 2), '&', 1)
   END = source.video_id
  JOIN public.sessions AS session ON session.id = resource.session_id
  JOIN public.lessons AS lesson ON lesson.id = session.lesson_id
  JOIN public.chapters AS chapter ON chapter.id = lesson.chapter_id
  JOIN public.books AS book ON book.id = chapter.book_id
  WHERE book.title = 'Mukhtasar Al-Akhdari'
)
UPDATE public.sessions AS session
SET order_index = matches.canonical_number - 1,
    source_title = COALESCE(session.source_title, 'Akhdari ' || matches.canonical_number),
    updated_at = now()
FROM matches
WHERE session.id = matches.session_id;

DO $verify$
DECLARE
  v_count integer;
  v_distinct_orders integer;
  v_min_order integer;
  v_max_order integer;
BEGIN
  SELECT count(*), count(DISTINCT session.order_index), min(session.order_index), max(session.order_index)
  INTO v_count, v_distinct_orders, v_min_order, v_max_order
  FROM public.sessions AS session
  JOIN public.lessons AS lesson ON lesson.id = session.lesson_id
  JOIN public.chapters AS chapter ON chapter.id = lesson.chapter_id
  JOIN public.books AS book ON book.id = chapter.book_id
  WHERE book.title = 'Mukhtasar Al-Akhdari';

  IF v_count <> 57 OR v_distinct_orders <> 57 OR v_min_order <> 0 OR v_max_order <> 56 THEN
    RAISE EXCEPTION
      'Akhdari canonical order failed: count %, distinct %, min %, max %',
      v_count, v_distinct_orders, v_min_order, v_max_order;
  END IF;
END
$verify$;
