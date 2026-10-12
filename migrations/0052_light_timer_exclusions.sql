-- 0052: initialize the Bathroom Light Timer exclusion list.
--
-- Exclusions are driven by an admin-editable config.excluded_terms list
-- (case-insensitive substring match against entity_id + friendly name)
-- on the timer's family_automations row.
UPDATE family_automations
SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{excluded_terms}', '[]'::jsonb, true),
    updated_at = NOW()
WHERE name = 'Bathroom Light Timer'
  AND NOT (COALESCE(config, '{}'::jsonb) ? 'excluded_terms');
