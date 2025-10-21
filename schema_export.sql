--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (165f042)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: abv_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.abv_status AS ENUM (
    'new',
    'in_progress',
    'completed',
    'cap_reached',
    'paused'
);


ALTER TYPE public.abv_status OWNER TO neondb_owner;

--
-- Name: account_cap_mode; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.account_cap_mode AS ENUM (
    'queue_size',
    'connected_calls',
    'positive_disp'
);


ALTER TYPE public.account_cap_mode OWNER TO neondb_owner;

--
-- Name: activity_entity_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.activity_entity_type AS ENUM (
    'contact',
    'account',
    'campaign',
    'call_job',
    'call_session',
    'lead',
    'user',
    'email_message'
);


ALTER TYPE public.activity_entity_type OWNER TO neondb_owner;

--
-- Name: activity_event_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.activity_event_type AS ENUM (
    'call_job_created',
    'call_job_scheduled',
    'call_job_removed',
    'call_started',
    'call_connected',
    'call_ended',
    'disposition_saved',
    'added_to_global_dnc',
    'campaign_opt_out_saved',
    'data_marked_invalid',
    'retry_scheduled',
    'account_cap_reached',
    'queue_rebuilt',
    'queue_set',
    'queue_cleared',
    'queue_cleared_all',
    'contact_called',
    'email_sent',
    'email_opened',
    'email_clicked',
    'form_submitted',
    'task_created',
    'task_completed',
    'note_added'
);


ALTER TYPE public.activity_event_type OWNER TO neondb_owner;

--
-- Name: address_enrichment_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.address_enrichment_status AS ENUM (
    'not_needed',
    'pending',
    'in_progress',
    'completed',
    'failed'
);


ALTER TYPE public.address_enrichment_status OWNER TO neondb_owner;

--
-- Name: agent_status_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.agent_status_type AS ENUM (
    'offline',
    'available',
    'busy',
    'after_call_work',
    'break',
    'away'
);


ALTER TYPE public.agent_status_type OWNER TO neondb_owner;

--
-- Name: amd_result; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.amd_result AS ENUM (
    'human',
    'machine',
    'unknown'
);


ALTER TYPE public.amd_result OWNER TO neondb_owner;

--
-- Name: auth_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.auth_status AS ENUM (
    'pending',
    'verified',
    'failed'
);


ALTER TYPE public.auth_status OWNER TO neondb_owner;

--
-- Name: call_disposition; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.call_disposition AS ENUM (
    'no-answer',
    'busy',
    'voicemail',
    'voicemail_left',
    'connected',
    'not_interested',
    'callback-requested',
    'qualified',
    'dnc-request'
);


ALTER TYPE public.call_disposition OWNER TO neondb_owner;

--
-- Name: call_job_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.call_job_status AS ENUM (
    'queued',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'removed'
);


ALTER TYPE public.call_job_status OWNER TO neondb_owner;

--
-- Name: call_session_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.call_session_status AS ENUM (
    'connecting',
    'ringing',
    'connected',
    'no_answer',
    'busy',
    'failed',
    'voicemail_detected',
    'cancelled',
    'completed'
);


ALTER TYPE public.call_session_status OWNER TO neondb_owner;

--
-- Name: campaign_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.campaign_status AS ENUM (
    'draft',
    'scheduled',
    'active',
    'paused',
    'completed',
    'cancelled'
);


ALTER TYPE public.campaign_status OWNER TO neondb_owner;

--
-- Name: campaign_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.campaign_type AS ENUM (
    'email',
    'call',
    'combo'
);


ALTER TYPE public.campaign_type OWNER TO neondb_owner;

--
-- Name: community; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.community AS ENUM (
    'finance',
    'marketing',
    'it',
    'hr',
    'cx_ux',
    'data_ai',
    'ops'
);


ALTER TYPE public.community OWNER TO neondb_owner;

--
-- Name: content_approval_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.content_approval_status AS ENUM (
    'draft',
    'in_review',
    'approved',
    'rejected',
    'published'
);


ALTER TYPE public.content_approval_status OWNER TO neondb_owner;

--
-- Name: content_asset_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.content_asset_type AS ENUM (
    'email_template',
    'landing_page',
    'social_post',
    'ad_creative',
    'pdf_document',
    'video',
    'call_script',
    'sales_sequence',
    'blog_post'
);


ALTER TYPE public.content_asset_type OWNER TO neondb_owner;

--
-- Name: content_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.content_status AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE public.content_status OWNER TO neondb_owner;

--
-- Name: content_tone; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.content_tone AS ENUM (
    'formal',
    'conversational',
    'insightful',
    'persuasive',
    'technical'
);


ALTER TYPE public.content_tone OWNER TO neondb_owner;

--
-- Name: custom_field_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.custom_field_type AS ENUM (
    'text',
    'number',
    'date',
    'boolean',
    'select',
    'multi_select',
    'url',
    'email'
);


ALTER TYPE public.custom_field_type OWNER TO neondb_owner;

--
-- Name: dedupe_scope; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.dedupe_scope AS ENUM (
    'project',
    'client',
    'global'
);


ALTER TYPE public.dedupe_scope OWNER TO neondb_owner;

--
-- Name: dial_mode; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.dial_mode AS ENUM (
    'manual',
    'power'
);


ALTER TYPE public.dial_mode OWNER TO neondb_owner;

--
-- Name: disposition_system_action; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.disposition_system_action AS ENUM (
    'add_to_global_dnc',
    'remove_from_campaign_queue',
    'remove_from_all_queues_for_contact',
    'retry_after_delay',
    'retry_with_next_attempt_window',
    'converted_qualified',
    'no_action'
);


ALTER TYPE public.disposition_system_action OWNER TO neondb_owner;

--
-- Name: dv_disposition; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.dv_disposition AS ENUM (
    'Verified',
    'PartiallyVerified',
    'InvalidEmail',
    'NoPhone',
    'Duplicate',
    'DoNotUse',
    'ExcludedByRule',
    'NeedsManualReview'
);


ALTER TYPE public.dv_disposition OWNER TO neondb_owner;

--
-- Name: dv_project_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.dv_project_status AS ENUM (
    'draft',
    'active',
    'paused',
    'closed'
);


ALTER TYPE public.dv_project_status OWNER TO neondb_owner;

--
-- Name: dv_record_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.dv_record_status AS ENUM (
    'new',
    'in_queue',
    'in_progress',
    'needs_fix',
    'excluded',
    'invalid',
    'verified',
    'delivered'
);


ALTER TYPE public.dv_record_status OWNER TO neondb_owner;

--
-- Name: dv_role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.dv_role AS ENUM (
    'verifier',
    'qa',
    'manager',
    'viewer'
);


ALTER TYPE public.dv_role OWNER TO neondb_owner;

--
-- Name: email_validation_job_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.email_validation_job_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE public.email_validation_job_status OWNER TO neondb_owner;

--
-- Name: email_verification_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.email_verification_status AS ENUM (
    'unknown',
    'valid',
    'invalid',
    'risky'
);


ALTER TYPE public.email_verification_status OWNER TO neondb_owner;

--
-- Name: entity_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.entity_type AS ENUM (
    'account',
    'contact'
);


ALTER TYPE public.entity_type OWNER TO neondb_owner;

--
-- Name: event_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.event_type AS ENUM (
    'webinar',
    'forum',
    'executive_dinner',
    'roundtable',
    'conference'
);


ALTER TYPE public.event_type OWNER TO neondb_owner;

--
-- Name: exclusion_scope; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.exclusion_scope AS ENUM (
    'global',
    'client',
    'project'
);


ALTER TYPE public.exclusion_scope OWNER TO neondb_owner;

--
-- Name: filter_field_category; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.filter_field_category AS ENUM (
    'contact_fields',
    'account_fields',
    'account_relationship',
    'suppression_fields',
    'email_campaign_fields',
    'telemarketing_campaign_fields',
    'qa_fields',
    'list_segment_fields',
    'client_portal_fields'
);


ALTER TYPE public.filter_field_category OWNER TO neondb_owner;

--
-- Name: industry_ai_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.industry_ai_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'partial'
);


ALTER TYPE public.industry_ai_status OWNER TO neondb_owner;

--
-- Name: location_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.location_type AS ENUM (
    'virtual',
    'in_person',
    'hybrid'
);


ALTER TYPE public.location_type OWNER TO neondb_owner;

--
-- Name: manual_queue_state; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.manual_queue_state AS ENUM (
    'queued',
    'locked',
    'in_progress',
    'completed',
    'removed',
    'released'
);


ALTER TYPE public.manual_queue_state OWNER TO neondb_owner;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.order_status AS ENUM (
    'draft',
    'submitted',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE public.order_status OWNER TO neondb_owner;

--
-- Name: phone_enrichment_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.phone_enrichment_status AS ENUM (
    'not_needed',
    'pending',
    'in_progress',
    'completed',
    'failed'
);


ALTER TYPE public.phone_enrichment_status OWNER TO neondb_owner;

--
-- Name: push_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.push_status AS ENUM (
    'pending',
    'in_progress',
    'success',
    'failed',
    'retrying'
);


ALTER TYPE public.push_status OWNER TO neondb_owner;

--
-- Name: qa_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.qa_status AS ENUM (
    'new',
    'under_review',
    'approved',
    'rejected',
    'returned',
    'published'
);


ALTER TYPE public.qa_status OWNER TO neondb_owner;

--
-- Name: queue_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.queue_status AS ENUM (
    'queued',
    'in_progress',
    'done',
    'removed'
);


ALTER TYPE public.queue_status OWNER TO neondb_owner;

--
-- Name: resource_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.resource_type AS ENUM (
    'ebook',
    'infographic',
    'white_paper',
    'guide',
    'case_study'
);


ALTER TYPE public.resource_type OWNER TO neondb_owner;

--
-- Name: revenue_range; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.revenue_range AS ENUM (
    '$0 - $100K',
    '$100K - $1M',
    '$1M - $5M',
    '$5M - $20M',
    '$20M - $50M',
    '$50M - $100M',
    '$100M - $500M',
    '$500M - $1B',
    '$1B+'
);


ALTER TYPE public.revenue_range OWNER TO neondb_owner;

--
-- Name: selection_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.selection_type AS ENUM (
    'explicit',
    'filtered'
);


ALTER TYPE public.selection_type OWNER TO neondb_owner;

--
-- Name: send_policy_scope; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.send_policy_scope AS ENUM (
    'tenant',
    'campaign'
);


ALTER TYPE public.send_policy_scope OWNER TO neondb_owner;

--
-- Name: social_platform; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.social_platform AS ENUM (
    'linkedin',
    'twitter',
    'facebook',
    'instagram',
    'youtube'
);


ALTER TYPE public.social_platform OWNER TO neondb_owner;

--
-- Name: source_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.source_type AS ENUM (
    'segment',
    'manual_upload',
    'selection',
    'filter'
);


ALTER TYPE public.source_type OWNER TO neondb_owner;

--
-- Name: staff_count_range; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.staff_count_range AS ENUM (
    '2-10 employees',
    '11 - 50 employees',
    '51 - 200 employees',
    '201 - 500 employees',
    '501 - 1,000 employees',
    '1,001 - 5,000 employees',
    '5,001 - 10,000 employees',
    '10,001+ employees'
);


ALTER TYPE public.staff_count_range OWNER TO neondb_owner;

--
-- Name: sto_mode; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.sto_mode AS ENUM (
    'off',
    'global_model',
    'per_contact'
);


ALTER TYPE public.sto_mode OWNER TO neondb_owner;

--
-- Name: upload_job_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.upload_job_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


ALTER TYPE public.upload_job_status OWNER TO neondb_owner;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'agent',
    'quality_analyst',
    'content_creator',
    'campaign_manager'
);


ALTER TYPE public.user_role OWNER TO neondb_owner;

--
-- Name: verification_eligibility_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.verification_eligibility_status AS ENUM (
    'Eligible',
    'Out_of_Scope'
);


ALTER TYPE public.verification_eligibility_status OWNER TO neondb_owner;

--
-- Name: verification_email_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.verification_email_status AS ENUM (
    'unknown',
    'ok',
    'invalid',
    'risky',
    'accept_all',
    'disposable'
);


ALTER TYPE public.verification_email_status OWNER TO neondb_owner;

--
-- Name: verification_qa_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.verification_qa_status AS ENUM (
    'Unreviewed',
    'Flagged',
    'Passed',
    'Rejected'
);


ALTER TYPE public.verification_qa_status OWNER TO neondb_owner;

--
-- Name: verification_source_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.verification_source_type AS ENUM (
    'Client_Provided',
    'New_Sourced'
);


ALTER TYPE public.verification_source_type OWNER TO neondb_owner;

--
-- Name: verification_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.verification_status AS ENUM (
    'Pending',
    'Validated',
    'Replaced',
    'Invalid'
);


ALTER TYPE public.verification_status OWNER TO neondb_owner;

--
-- Name: visibility_scope; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.visibility_scope AS ENUM (
    'private',
    'team',
    'global'
);


ALTER TYPE public.visibility_scope OWNER TO neondb_owner;

--
-- Name: voicemail_action; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.voicemail_action AS ENUM (
    'leave_voicemail',
    'schedule_callback',
    'drop_silent'
);


ALTER TYPE public.voicemail_action OWNER TO neondb_owner;

--
-- Name: voicemail_message_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.voicemail_message_type AS ENUM (
    'tts',
    'audio_file'
);


ALTER TYPE public.voicemail_message_type OWNER TO neondb_owner;

--
-- Name: warmup_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.warmup_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'paused'
);


ALTER TYPE public.warmup_status OWNER TO neondb_owner;

--
-- Name: clear_all_queues(character varying, character varying); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.clear_all_queues(p_campaign_id character varying, p_actor_user_id character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE v_released int;
BEGIN
  WITH upd AS (
    UPDATE agent_queue
       SET queue_state = 'released',
           released_at = now(),
           released_by = p_actor_user_id,
           updated_at = now()
     WHERE campaign_id = p_campaign_id
       AND queue_state IN ('queued','locked')
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_released FROM upd;

  -- Audit log
  INSERT INTO activity_log (entity_type, entity_id, event_type, payload, created_by, created_at)
  VALUES (
    'campaign',
    p_campaign_id,
    'queue_cleared',
    jsonb_build_object(
      'action', 'queue.clear.all',
      'released', v_released
    ),
    p_actor_user_id,
    now()
  );

  RETURN v_released;
END$$;


ALTER FUNCTION public.clear_all_queues(p_campaign_id character varying, p_actor_user_id character varying) OWNER TO neondb_owner;

--
-- Name: clear_my_queue(character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.clear_my_queue(p_campaign_id character varying, p_agent_id character varying, p_actor_user_id character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE v_released int;
BEGIN
  WITH upd AS (
    UPDATE agent_queue
       SET queue_state = 'released',
           released_at = now(),
           released_by = p_actor_user_id,
           updated_at = now()
     WHERE campaign_id = p_campaign_id
       AND agent_id    = p_agent_id
       AND queue_state IN ('queued','locked')
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_released FROM upd;

  -- Audit log
  INSERT INTO activity_log (entity_type, entity_id, event_type, payload, created_by, created_at)
  VALUES (
    'campaign',
    p_campaign_id,
    'queue_cleared',
    jsonb_build_object(
      'action', 'queue.clear.mine',
      'agent_id', p_agent_id,
      'released', v_released
    ),
    p_actor_user_id,
    now()
  );

  RETURN v_released;
END$$;


ALTER FUNCTION public.clear_my_queue(p_campaign_id character varying, p_agent_id character varying, p_actor_user_id character varying) OWNER TO neondb_owner;

--
-- Name: queue_replace(character varying, character varying, character varying, text, integer, integer, boolean); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.queue_replace(p_campaign_id character varying, p_agent_id character varying, p_actor_user_id character varying, p_first_name_contains text DEFAULT NULL::text, p_per_account_cap integer DEFAULT NULL::integer, p_max_queue_size integer DEFAULT NULL::integer, p_keep_in_progress boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE 
  v_released int := 0; 
  v_assigned int := 0; 
  v_skipped int := 0;
BEGIN
  -- 1) Release my queued/locked (optionally also in_progress)
  WITH upd AS (
    UPDATE agent_queue
       SET queue_state = 'released',
           released_at = now(),
           released_by = p_actor_user_id,
           updated_at = now()
     WHERE campaign_id = p_campaign_id
       AND agent_id    = p_agent_id
       AND (
         queue_state IN ('queued','locked')
         OR (queue_state = 'in_progress' AND NOT p_keep_in_progress)
       )
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_released FROM upd;

  -- 2) Get campaign_contacts that are in this campaign
  -- Build candidate pool respecting DNC/validity + filters
  WITH campaign_contact_ids AS (
    SELECT contact_id
    FROM campaign_queue
    WHERE campaign_id = p_campaign_id
  ),
  filtered AS (
    SELECT c.id AS contact_id, c.account_id
      FROM contacts c
     WHERE c.id IN (SELECT contact_id FROM campaign_contact_ids)
       AND (c.is_valid IS TRUE OR c.is_valid IS NULL)
       AND (c.is_opted_out IS FALSE OR c.is_opted_out IS NULL)
       -- Exclude global DNC
       AND NOT EXISTS (
         SELECT 1 FROM global_dnc g 
         WHERE g.contact_id = c.id
       )
       -- Apply first_name filter if provided
       AND (
         p_first_name_contains IS NULL
         OR c.first_name ILIKE '%' || p_first_name_contains || '%'
       )
  ),
  ranked AS (
    SELECT contact_id, account_id,
           ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY contact_id) AS rn
      FROM filtered
  ),
  capped AS (
    SELECT contact_id, account_id
      FROM ranked
     WHERE p_per_account_cap IS NULL OR rn <= p_per_account_cap
  ),
  available AS (
    SELECT cap.contact_id, cap.account_id
      FROM capped cap
     -- Exclude contacts already in active queue states for THIS campaign
     WHERE NOT EXISTS (
       SELECT 1 FROM agent_queue aq
       WHERE aq.contact_id  = cap.contact_id
         AND aq.campaign_id = p_campaign_id
         AND aq.queue_state IN ('queued','locked','in_progress')
     )
     LIMIT COALESCE(p_max_queue_size, 2147483647)
  ),
  ins AS (
    INSERT INTO agent_queue (
      campaign_id, agent_id, contact_id, account_id, 
      queue_state, queued_at, created_by, created_at, updated_at
    )
    SELECT 
      p_campaign_id, 
      p_agent_id, 
      a.contact_id, 
      a.account_id,
      'queued', 
      now(), 
      p_actor_user_id,
      now(),
      now()
    FROM available a
    ON CONFLICT (agent_id, campaign_id, contact_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_assigned FROM ins;

  -- 3) Count skipped due to collision (for reporting)
  WITH candidates AS (
    SELECT c.id AS contact_id
      FROM contacts c
     WHERE c.id IN (
       SELECT contact_id FROM campaign_queue WHERE campaign_id = p_campaign_id
     )
       AND (c.is_valid IS TRUE OR c.is_valid IS NULL)
       AND (c.is_opted_out IS FALSE OR c.is_opted_out IS NULL)
       AND NOT EXISTS (SELECT 1 FROM global_dnc g WHERE g.contact_id = c.id)
       AND (p_first_name_contains IS NULL OR c.first_name ILIKE '%'||p_first_name_contains||'%')
  )
  SELECT COUNT(*)
    INTO v_skipped
    FROM candidates c
   WHERE EXISTS (
     SELECT 1 FROM agent_queue aq
     WHERE aq.contact_id = c.contact_id
       AND aq.campaign_id = p_campaign_id
       AND aq.queue_state IN ('queued','locked','in_progress')
   );

  -- 4) Audit log
  INSERT INTO activity_log (entity_type, entity_id, event_type, payload, created_by, created_at)
  VALUES (
    'campaign',
    p_campaign_id,
    'queue_replaced',
    jsonb_build_object(
      'action', 'queue.replace',
      'agent_id', p_agent_id,
      'first_name_contains', p_first_name_contains,
      'per_account_cap', p_per_account_cap,
      'max_queue_size', p_max_queue_size,
      'keep_in_progress', p_keep_in_progress,
      'released', v_released,
      'assigned', v_assigned,
      'skipped_due_to_collision', v_skipped
    ),
    p_actor_user_id,
    now()
  );

  RETURN jsonb_build_object(
    'released', v_released,
    'assigned', v_assigned,
    'skipped_due_to_collision', v_skipped
  );
END$$;


ALTER FUNCTION public.queue_replace(p_campaign_id character varying, p_agent_id character varying, p_actor_user_id character varying, p_first_name_contains text, p_per_account_cap integer, p_max_queue_size integer, p_keep_in_progress boolean) OWNER TO neondb_owner;

--
-- Name: relink_cav_by_tuple(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.relink_cav_by_tuple() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_cav_id text;
  v_cav_user_id text;
BEGIN
  IF NEW.first_name IS NOT NULL AND (NEW.first_name_norm IS NULL OR NEW.first_name_norm = '') THEN
    NEW.first_name_norm := lower(regexp_replace(NEW.first_name, '[^a-z0-9]', '', 'g'));
  END IF;
  
  IF NEW.last_name IS NOT NULL AND (NEW.last_name_norm IS NULL OR NEW.last_name_norm = '') THEN
    NEW.last_name_norm := lower(regexp_replace(NEW.last_name, '[^a-z0-9]', '', 'g'));
  END IF;
  
  IF NEW.company_key IS NULL OR NEW.company_key = '' THEN
    IF NEW.account_id IS NOT NULL THEN
      SELECT lower(trim(regexp_replace(name, '\s+', ' ', 'g'))) 
      INTO NEW.company_key
      FROM accounts 
      WHERE id = NEW.account_id;
    END IF;
  END IF;
  
  IF NEW.contact_country IS NOT NULL AND (NEW.contact_country_key IS NULL OR NEW.contact_country_key = '') THEN
    NEW.contact_country_key := lower(trim(NEW.contact_country));
    
    CASE NEW.contact_country_key
      WHEN 'usa' THEN NEW.contact_country_key := 'united states';
      WHEN 'us' THEN NEW.contact_country_key := 'united states';
      WHEN 'uk' THEN NEW.contact_country_key := 'united kingdom';
      ELSE NULL;
    END CASE;
  END IF;
  
  IF (NEW.cav_id IS NULL OR NEW.cav_user_id IS NULL) AND
     NEW.first_name_norm IS NOT NULL AND
     NEW.last_name_norm IS NOT NULL AND
     NEW.company_key IS NOT NULL AND
     NEW.contact_country_key IS NOT NULL THEN
    
    SELECT c2.cav_id, c2.cav_user_id
    INTO v_cav_id, v_cav_user_id
    FROM verification_contacts c2
    WHERE c2.campaign_id = NEW.campaign_id
      AND c2.source_type = 'Client_Provided'
      AND c2.cav_id IS NOT NULL 
      AND c2.cav_user_id IS NOT NULL
      AND c2.first_name_norm = NEW.first_name_norm
      AND c2.last_name_norm = NEW.last_name_norm
      AND c2.company_key = NEW.company_key
      AND c2.contact_country_key = NEW.contact_country_key
    LIMIT 1;
    
    IF v_cav_id IS NOT NULL THEN
      NEW.cav_id := v_cav_id;
      NEW.cav_user_id := v_cav_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.relink_cav_by_tuple() OWNER TO neondb_owner;

--
-- Name: set_email_lower_vc(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.set_email_lower_vc() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.email_lower := CASE WHEN NEW.email IS NULL THEN NULL ELSE lower(NEW.email) END;
  RETURN NEW;
END; $$;


ALTER FUNCTION public.set_email_lower_vc() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_domains; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.account_domains (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying NOT NULL,
    domain text NOT NULL,
    domain_normalized text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.account_domains OWNER TO neondb_owner;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.accounts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    employees_size_range public.staff_count_range,
    staff_count integer,
    description text,
    hq_address text,
    hq_city text,
    hq_state text,
    hq_country text,
    year_founded integer,
    sic_code text,
    naics_code text,
    domain text,
    linkedin_url text,
    main_phone text,
    main_phone_e164 text,
    main_phone_extension text,
    intent_topics text[],
    tech_stack text[],
    owner_id character varying,
    custom_fields jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    linkedin_specialties text[],
    parent_account_id character varying,
    tags text[],
    name_normalized text,
    domain_normalized text,
    previous_names text[],
    source_system text,
    source_record_id text,
    source_updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    industry_standardized text,
    industry_secondary text[],
    industry_code text,
    industry_raw text,
    industry_ai_suggested text,
    industry_ai_candidates jsonb,
    industry_ai_topk text[],
    industry_ai_confidence numeric(5,4),
    industry_ai_source text,
    industry_ai_suggested_at timestamp without time zone,
    industry_ai_reviewed_by character varying,
    industry_ai_status public.industry_ai_status,
    industry_ai_reviewed_at timestamp without time zone,
    revenue_range public.revenue_range,
    hq_street_1 text,
    hq_street_2 text,
    hq_street_3 text,
    hq_state_abbr text,
    hq_postal_code text,
    company_location text,
    linkedin_id text,
    ai_enrichment_data jsonb,
    ai_enrichment_date timestamp without time zone,
    canonical_name text,
    founded_date date,
    founded_date_precision text,
    website_domain text,
    web_technologies text,
    web_technologies_json jsonb,
    annual_revenue numeric(20,2)
);


ALTER TABLE public.accounts OWNER TO neondb_owner;

--
-- Name: COLUMN accounts.annual_revenue; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.accounts.annual_revenue IS 'Annual revenue in numeric format (20,2) - no scientific notation allowed';


--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.activity_log (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.activity_entity_type NOT NULL,
    entity_id character varying NOT NULL,
    event_type public.activity_event_type NOT NULL,
    payload jsonb,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_log OWNER TO neondb_owner;

--
-- Name: agent_queue; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agent_queue (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    agent_id character varying NOT NULL,
    campaign_id character varying NOT NULL,
    contact_id character varying NOT NULL,
    account_id character varying,
    queue_state public.manual_queue_state DEFAULT 'queued'::public.manual_queue_state NOT NULL,
    locked_by character varying,
    locked_at timestamp without time zone,
    priority integer DEFAULT 0 NOT NULL,
    removed_reason text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    queued_at timestamp without time zone,
    released_at timestamp without time zone,
    created_by character varying,
    released_by character varying,
    lock_version integer DEFAULT 0 NOT NULL,
    lock_expires_at timestamp without time zone,
    scheduled_for timestamp without time zone,
    enqueued_by text,
    enqueued_reason text
);


ALTER TABLE public.agent_queue OWNER TO neondb_owner;

--
-- Name: agent_status; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agent_status (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    agent_id character varying NOT NULL,
    status public.agent_status_type DEFAULT 'offline'::public.agent_status_type NOT NULL,
    campaign_id character varying,
    current_call_id character varying,
    last_status_change_at timestamp without time zone DEFAULT now() NOT NULL,
    last_call_ended_at timestamp without time zone,
    total_calls_today integer DEFAULT 0,
    total_talk_time_today integer DEFAULT 0,
    break_reason text,
    status_metadata jsonb,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.agent_status OWNER TO neondb_owner;

--
-- Name: ai_content_generations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_content_generations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    asset_id character varying,
    prompt text NOT NULL,
    content_type public.content_asset_type NOT NULL,
    target_audience text,
    tone public.content_tone,
    cta_goal text,
    generated_content text NOT NULL,
    model text NOT NULL,
    tokens_used integer,
    user_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_content_generations OWNER TO neondb_owner;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id character varying NOT NULL,
    changes_json jsonb,
    ip_address text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: auto_dialer_queues; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.auto_dialer_queues (
    campaign_id character varying NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    dialing_mode character varying DEFAULT 'progressive'::character varying NOT NULL,
    max_concurrent_calls integer DEFAULT 1,
    dial_ratio numeric DEFAULT 1.0,
    check_dnc boolean DEFAULT true,
    priority_mode character varying DEFAULT 'fifo'::character varying,
    pacing_strategy character varying DEFAULT 'agent_based'::character varying,
    target_agent_occupancy numeric DEFAULT 0.85,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    max_concurrent_per_agent integer DEFAULT 1,
    ring_timeout_sec integer DEFAULT 30,
    abandon_rate_target_pct numeric DEFAULT 3.0,
    amd_enabled boolean DEFAULT false,
    amd_confidence_threshold numeric DEFAULT 0.75,
    amd_decision_timeout_ms integer DEFAULT 2500,
    amd_uncertain_fallback character varying DEFAULT 'route_as_human'::character varying,
    vm_action public.voicemail_action DEFAULT 'drop_silent'::public.voicemail_action,
    vm_asset_id character varying,
    vm_max_per_contact integer DEFAULT 1,
    vm_cooldown_hours integer DEFAULT 72,
    vm_daily_campaign_cap integer,
    vm_local_time_window jsonb,
    vm_restricted_region_block boolean DEFAULT false,
    distribution_strategy character varying DEFAULT 'round_robin'::character varying,
    retry_rules jsonb,
    quiet_hours jsonb,
    max_daily_attempts_per_contact integer DEFAULT 3
);


ALTER TABLE public.auto_dialer_queues OWNER TO neondb_owner;

--
-- Name: bulk_imports; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bulk_imports (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    file_name text NOT NULL,
    file_url text,
    status text DEFAULT 'processing'::text NOT NULL,
    total_rows integer,
    success_rows integer DEFAULT 0,
    error_rows integer DEFAULT 0,
    error_file_url text,
    uploaded_by_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


ALTER TABLE public.bulk_imports OWNER TO neondb_owner;

--
-- Name: business_hours_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.business_hours_config (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    timezone text NOT NULL,
    day_of_week integer NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.business_hours_config OWNER TO neondb_owner;

--
-- Name: call_attempts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.call_attempts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    contact_id character varying NOT NULL,
    agent_id character varying NOT NULL,
    telnyx_call_id text,
    recording_url text,
    disposition public.call_disposition,
    started_at timestamp without time zone,
    ended_at timestamp without time zone,
    duration integer,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    wrapup_seconds integer,
    script_version_id character varying,
    qa_locked boolean DEFAULT false,
    amd_result public.amd_result,
    amd_confidence numeric(3,2),
    vm_asset_id character varying,
    vm_delivered boolean DEFAULT false,
    vm_duration_sec integer
);


ALTER TABLE public.call_attempts OWNER TO neondb_owner;

--
-- Name: call_dispositions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.call_dispositions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    call_session_id character varying NOT NULL,
    disposition_id character varying NOT NULL,
    notes text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.call_dispositions OWNER TO neondb_owner;

--
-- Name: call_events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.call_events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    attempt_id character varying NOT NULL,
    type text NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.call_events OWNER TO neondb_owner;

--
-- Name: call_jobs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.call_jobs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    contact_id character varying NOT NULL,
    account_id character varying NOT NULL,
    agent_id character varying,
    status public.call_job_status DEFAULT 'queued'::public.call_job_status NOT NULL,
    scheduled_at timestamp without time zone,
    priority integer DEFAULT 0 NOT NULL,
    attempt_no integer DEFAULT 0 NOT NULL,
    locked_by_agent_id character varying,
    locked_at timestamp without time zone,
    removed_reason text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.call_jobs OWNER TO neondb_owner;

--
-- Name: call_recording_access_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.call_recording_access_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    call_attempt_id character varying NOT NULL,
    user_id character varying NOT NULL,
    action text NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.call_recording_access_logs OWNER TO neondb_owner;

--
-- Name: call_scripts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.call_scripts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying,
    name text NOT NULL,
    content text NOT NULL,
    version integer DEFAULT 1,
    changelog text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.call_scripts OWNER TO neondb_owner;

--
-- Name: call_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.call_sessions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    call_job_id character varying NOT NULL,
    telnyx_call_id text,
    from_number text,
    to_number_e164 text NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    ended_at timestamp without time zone,
    duration_sec integer,
    recording_url text,
    status public.call_session_status DEFAULT 'connecting'::public.call_session_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.call_sessions OWNER TO neondb_owner;

--
-- Name: calls; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.calls (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying,
    contact_id character varying,
    agent_id character varying,
    disposition public.call_disposition,
    duration integer,
    recording_url text,
    callback_requested boolean DEFAULT false,
    notes text,
    qualification_data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    queue_item_id character varying
);


ALTER TABLE public.calls OWNER TO neondb_owner;

--
-- Name: campaign_account_stats; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_account_stats (
    campaign_id character varying NOT NULL,
    account_id character varying NOT NULL,
    queued_count integer DEFAULT 0 NOT NULL,
    connected_count integer DEFAULT 0 NOT NULL,
    positive_disp_count integer DEFAULT 0 NOT NULL,
    last_enforced_at timestamp without time zone
);


ALTER TABLE public.campaign_account_stats OWNER TO neondb_owner;

--
-- Name: campaign_agent_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_agent_assignments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    agent_id character varying NOT NULL,
    assigned_by character varying,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL,
    released_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.campaign_agent_assignments OWNER TO neondb_owner;

--
-- Name: campaign_agents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_agents (
    campaign_id character varying NOT NULL,
    agent_id character varying NOT NULL,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaign_agents OWNER TO neondb_owner;

--
-- Name: campaign_audience_snapshots; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_audience_snapshots (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    audience_definition jsonb NOT NULL,
    contact_ids text[],
    account_ids text[],
    contact_count integer DEFAULT 0,
    account_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaign_audience_snapshots OWNER TO neondb_owner;

--
-- Name: campaign_content_links; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_content_links (
    id integer NOT NULL,
    campaign_id character varying NOT NULL,
    content_type character varying(50) NOT NULL,
    content_id character varying(255) NOT NULL,
    content_slug character varying(255) NOT NULL,
    content_title text NOT NULL,
    content_url text NOT NULL,
    form_id character varying(255),
    metadata jsonb,
    created_by character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaign_content_links OWNER TO neondb_owner;

--
-- Name: campaign_content_links_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.campaign_content_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaign_content_links_id_seq OWNER TO neondb_owner;

--
-- Name: campaign_content_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.campaign_content_links_id_seq OWNED BY public.campaign_content_links.id;


--
-- Name: campaign_opt_outs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_opt_outs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    contact_id character varying NOT NULL,
    reason text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaign_opt_outs OWNER TO neondb_owner;

--
-- Name: campaign_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_user_id character varying NOT NULL,
    order_number text NOT NULL,
    type public.campaign_type NOT NULL,
    status public.order_status DEFAULT 'draft'::public.order_status NOT NULL,
    lead_goal integer,
    pacing_config jsonb,
    qualification_criteria_json jsonb,
    compliance_confirmed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    submitted_at timestamp without time zone
);


ALTER TABLE public.campaign_orders OWNER TO neondb_owner;

--
-- Name: campaign_queue; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_queue (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    contact_id character varying NOT NULL,
    account_id character varying NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    status public.queue_status DEFAULT 'queued'::public.queue_status NOT NULL,
    removed_reason text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    agent_id character varying,
    lock_version integer DEFAULT 0 NOT NULL,
    lock_expires_at timestamp without time zone,
    next_attempt_at timestamp without time zone,
    enqueued_by text,
    enqueued_reason text
);


ALTER TABLE public.campaign_queue OWNER TO neondb_owner;

--
-- Name: campaign_suppression_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_suppression_accounts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    account_id character varying NOT NULL,
    reason text,
    added_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaign_suppression_accounts OWNER TO neondb_owner;

--
-- Name: campaign_suppression_contacts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_suppression_contacts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    contact_id character varying NOT NULL,
    reason text,
    added_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaign_suppression_contacts OWNER TO neondb_owner;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaigns (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    type public.campaign_type NOT NULL,
    name text NOT NULL,
    status public.campaign_status DEFAULT 'draft'::public.campaign_status NOT NULL,
    brand_id character varying,
    schedule_json jsonb,
    assigned_teams text[],
    audience_refs jsonb,
    throttling_config jsonb,
    email_subject text,
    email_html_content text,
    call_script text,
    qualification_questions jsonb,
    owner_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    launched_at timestamp without time zone,
    account_cap_enabled boolean DEFAULT false NOT NULL,
    account_cap_value integer,
    account_cap_mode public.account_cap_mode,
    retry_rules jsonb,
    timezone text,
    business_hours_config jsonb,
    target_qualified_leads integer,
    start_date date,
    end_date date,
    cost_per_lead numeric(10,2),
    qa_parameters jsonb,
    client_submission_config jsonb,
    dial_mode public.dial_mode DEFAULT 'power'::public.dial_mode NOT NULL,
    power_settings jsonb,
    script_id character varying
);


ALTER TABLE public.campaigns OWNER TO neondb_owner;

--
-- Name: city_reference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.city_reference (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    state_id character varying,
    country_id character varying NOT NULL,
    sort_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.city_reference OWNER TO neondb_owner;

--
-- Name: company_aliases; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.company_aliases (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    canonical_name text NOT NULL,
    alias text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying
);


ALTER TABLE public.company_aliases OWNER TO neondb_owner;

--
-- Name: company_size_reference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.company_size_reference (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    min_employees integer NOT NULL,
    max_employees integer,
    sort_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.company_size_reference OWNER TO neondb_owner;

--
-- Name: contact_emails; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contact_emails (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    contact_id character varying NOT NULL,
    email text NOT NULL,
    email_normalized text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contact_emails OWNER TO neondb_owner;

--
-- Name: contact_voicemail_tracking; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contact_voicemail_tracking (
    contact_id character varying NOT NULL,
    campaign_id character varying NOT NULL,
    vm_count integer DEFAULT 0 NOT NULL,
    last_vm_at timestamp without time zone,
    last_vm_asset_id character varying,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contact_voicemail_tracking OWNER TO neondb_owner;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contacts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying,
    full_name text NOT NULL,
    first_name text,
    last_name text,
    job_title text,
    email text NOT NULL,
    email_verification_status public.email_verification_status DEFAULT 'unknown'::public.email_verification_status,
    direct_phone text,
    direct_phone_e164 text,
    phone_extension text,
    seniority_level text,
    department text,
    address text,
    linkedin_url text,
    intent_topics text[],
    consent_basis text,
    consent_source text,
    consent_timestamp timestamp without time zone,
    owner_id character varying,
    custom_fields jsonb,
    email_status text DEFAULT 'unknown'::text,
    phone_status text DEFAULT 'unknown'::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    phone_verified_at timestamp without time zone,
    tags text[],
    email_normalized text,
    source_system text,
    source_record_id text,
    source_updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    mobile_phone text,
    mobile_phone_e164 text,
    timezone text,
    city text,
    state text,
    country text,
    is_invalid boolean DEFAULT false NOT NULL,
    invalid_reason text,
    invalidated_at timestamp without time zone,
    invalidated_by character varying,
    email_ai_confidence numeric(5,2),
    phone_ai_confidence numeric(5,2),
    former_position text,
    time_in_current_position text,
    time_in_current_company text,
    research_date timestamp without time zone,
    list text,
    state_abbr text,
    postal_code text,
    contact_location text,
    county text,
    time_in_current_position_months integer,
    time_in_current_company_months integer
);


ALTER TABLE public.contacts OWNER TO neondb_owner;

--
-- Name: content_approvals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.content_approvals (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    asset_id character varying NOT NULL,
    reviewer_id character varying NOT NULL,
    status public.content_approval_status NOT NULL,
    comments text,
    reviewed_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.content_approvals OWNER TO neondb_owner;

--
-- Name: content_asset_pushes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.content_asset_pushes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    asset_id character varying NOT NULL,
    target_url text NOT NULL,
    status public.push_status DEFAULT 'pending'::public.push_status NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    last_attempt_at timestamp without time zone,
    success_at timestamp without time zone,
    error_message text,
    response_payload jsonb,
    external_id text,
    pushed_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.content_asset_pushes OWNER TO neondb_owner;

--
-- Name: content_assets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.content_assets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    asset_type public.content_asset_type NOT NULL,
    title text NOT NULL,
    description text,
    content text,
    content_html text,
    thumbnail_url text,
    file_url text,
    tags text[] DEFAULT ARRAY[]::text[],
    metadata jsonb,
    approval_status public.content_approval_status DEFAULT 'draft'::public.content_approval_status NOT NULL,
    tone public.content_tone,
    target_audience text,
    cta_goal text,
    linked_campaigns text[] DEFAULT ARRAY[]::text[],
    usage_history jsonb DEFAULT '[]'::jsonb,
    version integer DEFAULT 1 NOT NULL,
    current_version_id character varying,
    owner_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.content_assets OWNER TO neondb_owner;

--
-- Name: content_events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.content_events (
    id integer NOT NULL,
    event_name character varying(50) NOT NULL,
    content_type character varying(50),
    content_id character varying(255),
    slug character varying(255),
    title text,
    community character varying(100),
    contact_id character varying(50),
    email character varying(255),
    url text,
    payload_json jsonb,
    ts timestamp without time zone NOT NULL,
    uniq_key character varying(500) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.content_events OWNER TO neondb_owner;

--
-- Name: content_events_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.content_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.content_events_id_seq OWNER TO neondb_owner;

--
-- Name: content_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.content_events_id_seq OWNED BY public.content_events.id;


--
-- Name: content_versions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.content_versions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    asset_id character varying NOT NULL,
    version_number integer NOT NULL,
    content text NOT NULL,
    content_html text,
    metadata jsonb,
    changed_by character varying NOT NULL,
    change_description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.content_versions OWNER TO neondb_owner;

--
-- Name: country_reference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.country_reference (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    sort_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.country_reference OWNER TO neondb_owner;

--
-- Name: custom_field_definitions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.custom_field_definitions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.entity_type NOT NULL,
    field_key text NOT NULL,
    display_label text NOT NULL,
    field_type public.custom_field_type NOT NULL,
    options jsonb,
    required boolean DEFAULT false NOT NULL,
    default_value text,
    help_text text,
    display_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying
);


ALTER TABLE public.custom_field_definitions OWNER TO neondb_owner;

--
-- Name: dedupe_review_queue; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dedupe_review_queue (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    candidate_a_id character varying NOT NULL,
    candidate_b_id character varying NOT NULL,
    match_score real NOT NULL,
    match_reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by character varying,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dedupe_review_queue OWNER TO neondb_owner;

--
-- Name: department_reference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.department_reference (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.department_reference OWNER TO neondb_owner;

--
-- Name: dispositions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dispositions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    system_action public.disposition_system_action NOT NULL,
    params jsonb,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying
);


ALTER TABLE public.dispositions OWNER TO neondb_owner;

--
-- Name: dkim_keys; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dkim_keys (
    id integer NOT NULL,
    domain_auth_id integer NOT NULL,
    selector text NOT NULL,
    public_key text NOT NULL,
    rotation_due_at timestamp without time zone,
    status public.auth_status DEFAULT 'pending'::public.auth_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dkim_keys OWNER TO neondb_owner;

--
-- Name: dkim_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.dkim_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dkim_keys_id_seq OWNER TO neondb_owner;

--
-- Name: dkim_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.dkim_keys_id_seq OWNED BY public.dkim_keys.id;


--
-- Name: domain_auth; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.domain_auth (
    id integer NOT NULL,
    domain text NOT NULL,
    spf_status public.auth_status DEFAULT 'pending'::public.auth_status NOT NULL,
    dkim_status public.auth_status DEFAULT 'pending'::public.auth_status NOT NULL,
    dmarc_status public.auth_status DEFAULT 'pending'::public.auth_status NOT NULL,
    tracking_domain_status public.auth_status DEFAULT 'pending'::public.auth_status NOT NULL,
    bimi_status public.auth_status DEFAULT 'pending'::public.auth_status,
    last_checked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.domain_auth OWNER TO neondb_owner;

--
-- Name: domain_auth_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.domain_auth_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.domain_auth_id_seq OWNER TO neondb_owner;

--
-- Name: domain_auth_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.domain_auth_id_seq OWNED BY public.domain_auth.id;


--
-- Name: domain_reputation_snapshots; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.domain_reputation_snapshots (
    id integer NOT NULL,
    domain text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    metrics_json jsonb NOT NULL,
    health_score integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.domain_reputation_snapshots OWNER TO neondb_owner;

--
-- Name: domain_reputation_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.domain_reputation_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.domain_reputation_snapshots_id_seq OWNER TO neondb_owner;

--
-- Name: domain_reputation_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.domain_reputation_snapshots_id_seq OWNED BY public.domain_reputation_snapshots.id;


--
-- Name: domain_set_contact_links; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.domain_set_contact_links (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    domain_set_id character varying NOT NULL,
    contact_id character varying NOT NULL,
    account_id character varying,
    matched_via text NOT NULL,
    included_in_list boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.domain_set_contact_links OWNER TO neondb_owner;

--
-- Name: domain_set_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.domain_set_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    domain_set_id character varying NOT NULL,
    domain text NOT NULL,
    normalized_domain text NOT NULL,
    account_id character varying,
    match_type text,
    match_confidence numeric(3,2),
    matched_contacts_count integer DEFAULT 0,
    auto_created_account boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    account_name text,
    matched_by text
);


ALTER TABLE public.domain_set_items OWNER TO neondb_owner;

--
-- Name: domain_sets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.domain_sets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    owner_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    description text,
    upload_file_uri text,
    total_uploaded integer DEFAULT 0,
    matched_accounts integer DEFAULT 0,
    matched_contacts integer DEFAULT 0,
    duplicates_removed integer DEFAULT 0,
    unknown_domains integer DEFAULT 0,
    status text DEFAULT 'processing'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[]
);


ALTER TABLE public.domain_sets OWNER TO neondb_owner;

--
-- Name: dv_account_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_account_assignments (
    account_id character varying NOT NULL,
    user_id character varying NOT NULL,
    role public.dv_role DEFAULT 'verifier'::public.dv_role NOT NULL
);


ALTER TABLE public.dv_account_assignments OWNER TO neondb_owner;

--
-- Name: dv_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_accounts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    account_name character varying,
    account_domain character varying NOT NULL,
    website character varying,
    linkedin_url character varying,
    target_contacts integer DEFAULT 0 NOT NULL,
    verified_count integer DEFAULT 0 NOT NULL,
    status public.abv_status DEFAULT 'new'::public.abv_status NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dv_accounts OWNER TO neondb_owner;

--
-- Name: dv_agent_filters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_agent_filters (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    user_id character varying NOT NULL,
    name character varying NOT NULL,
    filter_json jsonb NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dv_agent_filters OWNER TO neondb_owner;

--
-- Name: dv_company_caps; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_company_caps (
    project_id character varying NOT NULL,
    account_domain character varying NOT NULL,
    verified_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.dv_company_caps OWNER TO neondb_owner;

--
-- Name: dv_deliveries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_deliveries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    type character varying NOT NULL,
    filter jsonb,
    row_count integer,
    file_path character varying,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dv_deliveries OWNER TO neondb_owner;

--
-- Name: dv_exclusion_lists; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_exclusion_lists (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    scope public.exclusion_scope NOT NULL,
    client_id character varying,
    fields jsonb NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    type character varying NOT NULL,
    pattern text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.dv_exclusion_lists OWNER TO neondb_owner;

--
-- Name: dv_field_constraints; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_field_constraints (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    field_name character varying NOT NULL,
    rule_type character varying NOT NULL,
    rule_value jsonb NOT NULL
);


ALTER TABLE public.dv_field_constraints OWNER TO neondb_owner;

--
-- Name: dv_field_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_field_mappings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    client_header character varying NOT NULL,
    crm_field character varying NOT NULL,
    confidence real DEFAULT 0 NOT NULL,
    required boolean DEFAULT false NOT NULL
);


ALTER TABLE public.dv_field_mappings OWNER TO neondb_owner;

--
-- Name: dv_project_agents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_project_agents (
    project_id character varying NOT NULL,
    user_id character varying NOT NULL,
    role public.dv_role DEFAULT 'verifier'::public.dv_role NOT NULL
);


ALTER TABLE public.dv_project_agents OWNER TO neondb_owner;

--
-- Name: dv_project_exclusions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_project_exclusions (
    project_id character varying NOT NULL,
    list_id character varying NOT NULL
);


ALTER TABLE public.dv_project_exclusions OWNER TO neondb_owner;

--
-- Name: dv_projects; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_projects (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    name character varying NOT NULL,
    description text,
    template_id character varying,
    rulepack_id character varying,
    status public.dv_project_status DEFAULT 'draft'::public.dv_project_status NOT NULL,
    cap_per_company integer DEFAULT 0 NOT NULL,
    dedupe_scope public.dedupe_scope DEFAULT 'client'::public.dedupe_scope NOT NULL,
    abv_mode boolean DEFAULT false NOT NULL,
    default_target_per_account integer DEFAULT 0 NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dv_projects OWNER TO neondb_owner;

--
-- Name: dv_records; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_records (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    account_id character varying,
    account_name character varying,
    account_domain character varying,
    contact_full_name character varying,
    email character varying,
    phone_raw character varying,
    phone_e164 character varying,
    job_title character varying,
    country character varying,
    state character varying,
    city character varying,
    zip character varying,
    website character varying,
    extras jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.dv_record_status DEFAULT 'new'::public.dv_record_status NOT NULL,
    dedupe_hash character varying,
    exclusion_reason character varying,
    invalid_reason character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    first_name character varying,
    last_name character varying,
    address_1 character varying,
    address_2 character varying,
    address_3 character varying,
    normalized_at timestamp without time zone,
    email_validated_at timestamp without time zone,
    phone_parsed_at timestamp without time zone,
    exclusion_checked_at timestamp without time zone,
    enqueued_at timestamp without time zone,
    linkedin_url character varying
);


ALTER TABLE public.dv_records OWNER TO neondb_owner;

--
-- Name: dv_records_raw; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_records_raw (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    payload jsonb NOT NULL,
    imported_at timestamp without time zone DEFAULT now() NOT NULL,
    source_file character varying,
    row_num integer
);


ALTER TABLE public.dv_records_raw OWNER TO neondb_owner;

--
-- Name: dv_runs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_runs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    record_id character varying NOT NULL,
    project_id character varying NOT NULL,
    agent_id character varying,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    finished_at timestamp without time zone,
    disposition public.dv_disposition,
    notes text,
    checks jsonb,
    enrichment jsonb,
    result_status public.dv_record_status
);


ALTER TABLE public.dv_runs OWNER TO neondb_owner;

--
-- Name: dv_selection_sets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dv_selection_sets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    name character varying NOT NULL,
    description text,
    filter_json jsonb NOT NULL,
    record_ids jsonb,
    is_default boolean DEFAULT false NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dv_selection_sets OWNER TO neondb_owner;

--
-- Name: email_events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    send_id character varying NOT NULL,
    type text NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_events OWNER TO neondb_owner;

--
-- Name: email_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying,
    contact_id character varying,
    provider_message_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    delivered_at timestamp without time zone,
    opened_at timestamp without time zone,
    clicked_at timestamp without time zone,
    bounced_at timestamp without time zone,
    complaint_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_messages OWNER TO neondb_owner;

--
-- Name: email_sends; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_sends (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    contact_id character varying NOT NULL,
    template_id character varying,
    sender_profile_id character varying,
    provider_message_id text,
    provider text,
    status text DEFAULT 'pending'::text NOT NULL,
    send_at timestamp without time zone,
    sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_sends OWNER TO neondb_owner;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    placeholders text[],
    version integer DEFAULT 1,
    is_approved boolean DEFAULT false,
    approved_by_id character varying,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_templates OWNER TO neondb_owner;

--
-- Name: events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    event_type public.event_type NOT NULL,
    location_type public.location_type NOT NULL,
    community public.community NOT NULL,
    organizer text,
    sponsor text,
    speakers jsonb DEFAULT '[]'::jsonb,
    start_iso text NOT NULL,
    end_iso text,
    timezone text,
    overview_html text,
    learn_bullets text[] DEFAULT ARRAY[]::text[],
    thumbnail_url text,
    cta_link text,
    form_id text,
    seo jsonb,
    status public.content_status DEFAULT 'draft'::public.content_status NOT NULL,
    owner_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.events OWNER TO neondb_owner;

--
-- Name: field_change_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.field_change_log (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id character varying NOT NULL,
    field_key text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    source_system text,
    actor_id character varying,
    survivorship_policy text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.field_change_log OWNER TO neondb_owner;

--
-- Name: filter_field_registry; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.filter_field_registry (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    entity text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    type text NOT NULL,
    operators text[] NOT NULL,
    category public.filter_field_category NOT NULL,
    is_custom boolean DEFAULT false NOT NULL,
    visible_in_filters boolean DEFAULT true NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.filter_field_registry OWNER TO neondb_owner;

--
-- Name: global_dnc; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.global_dnc (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    contact_id character varying,
    phone_e164 text,
    source text NOT NULL,
    reason text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.global_dnc OWNER TO neondb_owner;

--
-- Name: industry_reference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.industry_reference (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    naics_code text,
    synonyms text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    parent_id character varying,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.industry_reference OWNER TO neondb_owner;

--
-- Name: ip_pools; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ip_pools (
    id integer NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    ip_addresses text[] NOT NULL,
    warmup_status public.warmup_status DEFAULT 'not_started'::public.warmup_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ip_pools OWNER TO neondb_owner;

--
-- Name: ip_pools_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ip_pools_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ip_pools_id_seq OWNER TO neondb_owner;

--
-- Name: ip_pools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ip_pools_id_seq OWNED BY public.ip_pools.id;


--
-- Name: job_function_reference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.job_function_reference (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.job_function_reference OWNER TO neondb_owner;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.leads (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    contact_id character varying NOT NULL,
    campaign_id character varying,
    qa_status public.qa_status DEFAULT 'new'::public.qa_status NOT NULL,
    checklist_json jsonb,
    approved_at timestamp without time zone,
    approved_by_id character varying,
    rejected_reason text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    contact_name text,
    contact_email text,
    call_attempt_id character varying,
    recording_url text,
    call_duration integer,
    agent_id character varying,
    transcript text,
    transcription_status text,
    ai_score numeric(5,2),
    ai_analysis jsonb,
    ai_qualification_status text,
    submitted_to_client boolean DEFAULT false,
    submitted_at timestamp without time zone,
    submission_response jsonb
);


ALTER TABLE public.leads OWNER TO neondb_owner;

--
-- Name: lists; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lists (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    owner_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    entity_type public.entity_type DEFAULT 'contact'::public.entity_type NOT NULL,
    source_type public.source_type DEFAULT 'manual_upload'::public.source_type NOT NULL,
    source_ref character varying,
    snapshot_ts timestamp without time zone DEFAULT now() NOT NULL,
    record_ids text[] DEFAULT '{}'::text[] NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    visibility_scope public.visibility_scope DEFAULT 'private'::public.visibility_scope NOT NULL
);


ALTER TABLE public.lists OWNER TO neondb_owner;

--
-- Name: news; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.news (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    community public.community NOT NULL,
    overview_html text,
    body_html text,
    authors text[] DEFAULT ARRAY[]::text[],
    published_iso text,
    thumbnail_url text,
    seo jsonb,
    status public.content_status DEFAULT 'draft'::public.content_status NOT NULL,
    owner_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.news OWNER TO neondb_owner;

--
-- Name: order_assets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.order_assets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    asset_type text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_assets OWNER TO neondb_owner;

--
-- Name: order_audience_snapshots; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.order_audience_snapshots (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    audience_definition_json jsonb NOT NULL,
    contact_count integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_audience_snapshots OWNER TO neondb_owner;

--
-- Name: order_campaign_links; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.order_campaign_links (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    campaign_id character varying NOT NULL,
    linked_by_id character varying NOT NULL,
    linked_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_campaign_links OWNER TO neondb_owner;

--
-- Name: order_qualification_questions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.order_qualification_questions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    question_text text NOT NULL,
    question_type text NOT NULL,
    options_json jsonb,
    required boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_qualification_questions OWNER TO neondb_owner;

--
-- Name: organizers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organizers (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    logo_url text,
    website_url text,
    external_id character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organizers OWNER TO neondb_owner;

--
-- Name: organizers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.organizers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizers_id_seq OWNER TO neondb_owner;

--
-- Name: organizers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.organizers_id_seq OWNED BY public.organizers.id;


--
-- Name: per_domain_stats; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.per_domain_stats (
    id integer NOT NULL,
    sending_domain text NOT NULL,
    recipient_provider text NOT NULL,
    day text NOT NULL,
    delivered integer DEFAULT 0,
    bounces_hard integer DEFAULT 0,
    bounces_soft integer DEFAULT 0,
    complaints integer DEFAULT 0,
    opens integer DEFAULT 0,
    clicks integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.per_domain_stats OWNER TO neondb_owner;

--
-- Name: per_domain_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.per_domain_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.per_domain_stats_id_seq OWNER TO neondb_owner;

--
-- Name: per_domain_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.per_domain_stats_id_seq OWNED BY public.per_domain_stats.id;


--
-- Name: qualification_responses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.qualification_responses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    attempt_id character varying,
    lead_id character varying,
    schema_version text,
    answers_json jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.qualification_responses OWNER TO neondb_owner;

--
-- Name: resources; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.resources (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    resource_type public.resource_type NOT NULL,
    community public.community NOT NULL,
    overview_html text,
    bullets text[] DEFAULT ARRAY[]::text[],
    body_html text,
    thumbnail_url text,
    cta_link text,
    form_id text,
    seo jsonb,
    status public.content_status DEFAULT 'draft'::public.content_status NOT NULL,
    owner_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.resources OWNER TO neondb_owner;

--
-- Name: revenue_range_reference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.revenue_range_reference (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    description text,
    min_revenue numeric(15,2),
    max_revenue numeric(15,2),
    sort_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.revenue_range_reference OWNER TO neondb_owner;

--
-- Name: saved_filters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saved_filters (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    name text NOT NULL,
    description text,
    entity_type text NOT NULL,
    filter_group jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.saved_filters OWNER TO neondb_owner;

--
-- Name: segments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.segments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    definition_json jsonb NOT NULL,
    owner_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    entity_type public.entity_type DEFAULT 'contact'::public.entity_type NOT NULL,
    last_refreshed_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    record_count_cache integer DEFAULT 0,
    tags text[] DEFAULT '{}'::text[],
    visibility_scope public.visibility_scope DEFAULT 'private'::public.visibility_scope NOT NULL
);


ALTER TABLE public.segments OWNER TO neondb_owner;

--
-- Name: selection_contexts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.selection_contexts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    entity_type public.entity_type NOT NULL,
    selection_type public.selection_type NOT NULL,
    ids text[],
    filter_group jsonb,
    total_count integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.selection_contexts OWNER TO neondb_owner;

--
-- Name: send_policies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.send_policies (
    id integer NOT NULL,
    name text NOT NULL,
    scope public.send_policy_scope DEFAULT 'tenant'::public.send_policy_scope NOT NULL,
    sto_mode public.sto_mode DEFAULT 'off'::public.sto_mode NOT NULL,
    sto_window_hours integer DEFAULT 24,
    batch_size integer DEFAULT 5000,
    batch_gap_minutes integer DEFAULT 15,
    seed_test_batch boolean DEFAULT false,
    global_tps integer DEFAULT 10,
    per_domain_caps jsonb,
    frequency_cap integer,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.send_policies OWNER TO neondb_owner;

--
-- Name: send_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.send_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.send_policies_id_seq OWNER TO neondb_owner;

--
-- Name: send_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.send_policies_id_seq OWNED BY public.send_policies.id;


--
-- Name: sender_profiles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sender_profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    brand_id character varying,
    from_name text NOT NULL,
    from_email text NOT NULL,
    dkim_domain text,
    tracking_domain text,
    reply_to_email text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    reply_to text,
    tracking_domain_id integer,
    esp_adapter text DEFAULT 'sendgrid'::text,
    ip_pool_id integer,
    default_throttle_tps integer DEFAULT 10,
    daily_cap integer,
    signature_html text,
    status text DEFAULT 'active'::text,
    is_default boolean DEFAULT false,
    esp_provider text,
    domain_auth_id integer,
    is_verified boolean,
    reputation_score integer,
    warmup_status text,
    created_by character varying
);


ALTER TABLE public.sender_profiles OWNER TO neondb_owner;

--
-- Name: seniority_level_reference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.seniority_level_reference (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.seniority_level_reference OWNER TO neondb_owner;

--
-- Name: sip_trunk_configs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sip_trunk_configs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    provider text DEFAULT 'telnyx'::text NOT NULL,
    sip_username text NOT NULL,
    sip_password text NOT NULL,
    sip_domain text DEFAULT 'sip.telnyx.com'::text NOT NULL,
    connection_id text,
    outbound_voice_profile_id text,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    caller_id_number text
);


ALTER TABLE public.sip_trunk_configs OWNER TO neondb_owner;

--
-- Name: social_posts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.social_posts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    asset_id character varying,
    platform public.social_platform NOT NULL,
    content text NOT NULL,
    media_urls text[] DEFAULT ARRAY[]::text[],
    scheduled_at timestamp without time zone,
    published_at timestamp without time zone,
    status public.content_approval_status DEFAULT 'draft'::public.content_approval_status NOT NULL,
    utm_parameters jsonb,
    platform_post_id text,
    engagement jsonb,
    sentiment text,
    owner_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.social_posts OWNER TO neondb_owner;

--
-- Name: softphone_profiles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.softphone_profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    mic_device_id text,
    speaker_device_id text,
    last_test_at timestamp without time zone,
    test_results_json jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.softphone_profiles OWNER TO neondb_owner;

--
-- Name: speakers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.speakers (
    id integer NOT NULL,
    name text NOT NULL,
    title text,
    company text,
    bio text,
    photo_url text,
    linkedin_url text,
    external_id character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.speakers OWNER TO neondb_owner;

--
-- Name: speakers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.speakers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.speakers_id_seq OWNER TO neondb_owner;

--
-- Name: speakers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.speakers_id_seq OWNED BY public.speakers.id;


--
-- Name: sponsors; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sponsors (
    id integer NOT NULL,
    name text NOT NULL,
    tier character varying(50),
    description text,
    logo_url text,
    website_url text,
    external_id character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sponsors OWNER TO neondb_owner;

--
-- Name: sponsors_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sponsors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sponsors_id_seq OWNER TO neondb_owner;

--
-- Name: sponsors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sponsors_id_seq OWNED BY public.sponsors.id;


--
-- Name: state_reference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.state_reference (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text,
    country_id character varying NOT NULL,
    sort_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.state_reference OWNER TO neondb_owner;

--
-- Name: suppression_emails; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.suppression_emails (
    id integer NOT NULL,
    email text NOT NULL,
    reason text,
    source text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.suppression_emails OWNER TO neondb_owner;

--
-- Name: suppression_emails_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.suppression_emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppression_emails_id_seq OWNER TO neondb_owner;

--
-- Name: suppression_emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.suppression_emails_id_seq OWNED BY public.suppression_emails.id;


--
-- Name: suppression_phones; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.suppression_phones (
    id integer NOT NULL,
    phone_e164 text NOT NULL,
    reason text,
    source text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.suppression_phones OWNER TO neondb_owner;

--
-- Name: suppression_phones_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.suppression_phones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppression_phones_id_seq OWNER TO neondb_owner;

--
-- Name: suppression_phones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.suppression_phones_id_seq OWNED BY public.suppression_phones.id;


--
-- Name: technology_reference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.technology_reference (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.technology_reference OWNER TO neondb_owner;

--
-- Name: tracking_domains; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tracking_domains (
    id integer NOT NULL,
    cname text NOT NULL,
    target text NOT NULL,
    tls_status public.auth_status DEFAULT 'pending'::public.auth_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tracking_domains OWNER TO neondb_owner;

--
-- Name: tracking_domains_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.tracking_domains_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tracking_domains_id_seq OWNER TO neondb_owner;

--
-- Name: tracking_domains_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.tracking_domains_id_seq OWNED BY public.tracking_domains.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_roles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    role public.user_role NOT NULL,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL,
    assigned_by character varying
);


ALTER TABLE public.user_roles OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public.user_role DEFAULT 'agent'::public.user_role NOT NULL,
    first_name text,
    last_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: verification_audit_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.verification_audit_log (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    actor_id character varying,
    entity_type text,
    entity_id text,
    action text,
    before jsonb,
    after jsonb,
    at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.verification_audit_log OWNER TO neondb_owner;

--
-- Name: verification_campaigns; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.verification_campaigns (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    monthly_target integer DEFAULT 1000,
    lead_cap_per_account integer DEFAULT 10,
    eligibility_config jsonb,
    email_validation_provider text DEFAULT 'emaillistverify'::text,
    ok_email_states text[] DEFAULT ARRAY['valid'::text, 'accept_all'::text],
    suppression_match_fields text[] DEFAULT ARRAY['email_lower'::text, 'cav_id'::text, 'cav_user_id'::text, 'name_company_hash'::text],
    address_precedence text[] DEFAULT ARRAY['contact'::text, 'hq'::text],
    ok_rate_target numeric(5,2) DEFAULT 0.95,
    deliverability_target numeric(5,2) DEFAULT 0.97,
    suppression_hit_rate_max numeric(5,2) DEFAULT 0.05,
    qa_pass_rate_min numeric(5,2) DEFAULT 0.98,
    status text DEFAULT 'active'::text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.verification_campaigns OWNER TO neondb_owner;

--
-- Name: verification_contacts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.verification_contacts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    account_id character varying,
    source_type public.verification_source_type NOT NULL,
    full_name text NOT NULL,
    first_name text,
    last_name text,
    title text,
    email text,
    phone text,
    mobile text,
    linkedin_url text,
    contact_city text,
    contact_state text,
    contact_country text,
    contact_postal text,
    cav_id text,
    cav_user_id text,
    eligibility_status public.verification_eligibility_status DEFAULT 'Out_of_Scope'::public.verification_eligibility_status,
    eligibility_reason text,
    verification_status public.verification_status DEFAULT 'Pending'::public.verification_status,
    qa_status public.verification_qa_status DEFAULT 'Unreviewed'::public.verification_qa_status,
    email_status public.verification_email_status DEFAULT 'unknown'::public.verification_email_status,
    suppressed boolean DEFAULT false,
    assignee_id character varying,
    priority_score numeric(10,2),
    in_submission_buffer boolean DEFAULT false,
    first_name_norm text,
    last_name_norm text,
    company_key text,
    contact_country_key text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    email_lower text,
    deleted boolean DEFAULT false,
    contact_address1 text,
    contact_address2 text,
    contact_address3 text,
    hq_address_1 text,
    hq_address_2 text,
    hq_address_3 text,
    hq_city text,
    hq_state text,
    hq_country text,
    hq_postal text,
    address_enrichment_status public.address_enrichment_status DEFAULT 'not_needed'::public.address_enrichment_status,
    address_enriched_at timestamp without time zone,
    address_enrichment_error text,
    hq_phone text,
    phone_enrichment_status public.phone_enrichment_status DEFAULT 'not_needed'::public.phone_enrichment_status,
    phone_enriched_at timestamp without time zone,
    phone_enrichment_error text,
    former_position text,
    time_in_current_position text,
    time_in_current_position_months integer,
    time_in_current_company text,
    time_in_current_company_months integer
);


ALTER TABLE public.verification_contacts OWNER TO neondb_owner;

--
-- Name: verification_email_validation_jobs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.verification_email_validation_jobs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    status public.email_validation_job_status DEFAULT 'pending'::public.email_validation_job_status NOT NULL,
    total_contacts integer DEFAULT 0 NOT NULL,
    processed_contacts integer DEFAULT 0 NOT NULL,
    current_batch integer DEFAULT 0 NOT NULL,
    total_batches integer DEFAULT 0 NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    status_counts jsonb DEFAULT '{"ok": 0, "risky": 0, "invalid": 0, "unknown": 0, "accept_all": 0, "disposable": 0}'::jsonb,
    error_message text,
    contact_ids jsonb,
    created_by character varying,
    started_at timestamp without time zone,
    finished_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.verification_email_validation_jobs OWNER TO neondb_owner;

--
-- Name: verification_email_validations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.verification_email_validations (
    contact_id character varying NOT NULL,
    provider text DEFAULT 'ELV'::text NOT NULL,
    status public.verification_email_status NOT NULL,
    raw_json jsonb,
    checked_at timestamp without time zone DEFAULT now() NOT NULL,
    email_lower character varying NOT NULL
);


ALTER TABLE public.verification_email_validations OWNER TO neondb_owner;

--
-- Name: verification_lead_submissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.verification_lead_submissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    contact_id character varying NOT NULL,
    account_id character varying,
    campaign_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    excluded_reason text
);


ALTER TABLE public.verification_lead_submissions OWNER TO neondb_owner;

--
-- Name: verification_suppression_list; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.verification_suppression_list (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying,
    email_lower text,
    cav_id text,
    cav_user_id text,
    name_company_hash text,
    added_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.verification_suppression_list OWNER TO neondb_owner;

--
-- Name: verification_upload_jobs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.verification_upload_jobs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    status public.upload_job_status DEFAULT 'pending'::public.upload_job_status NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    processed_rows integer DEFAULT 0 NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb,
    csv_data text,
    field_mappings jsonb,
    update_mode boolean DEFAULT false,
    created_by character varying,
    started_at timestamp without time zone,
    finished_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.verification_upload_jobs OWNER TO neondb_owner;

--
-- Name: voicemail_assets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.voicemail_assets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    message_type public.voicemail_message_type NOT NULL,
    tts_voice_id text,
    tts_template text,
    audio_file_url text,
    audio_file_key text,
    duration_sec integer,
    locale text DEFAULT 'en-US'::text,
    owner_id character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.voicemail_assets OWNER TO neondb_owner;

--
-- Name: warmup_plans; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.warmup_plans (
    id integer NOT NULL,
    ip_pool_id integer NOT NULL,
    day integer NOT NULL,
    daily_cap integer NOT NULL,
    domain_split_json jsonb,
    status public.warmup_status DEFAULT 'not_started'::public.warmup_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.warmup_plans OWNER TO neondb_owner;

--
-- Name: warmup_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.warmup_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warmup_plans_id_seq OWNER TO neondb_owner;

--
-- Name: warmup_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.warmup_plans_id_seq OWNED BY public.warmup_plans.id;


--
-- Name: campaign_content_links id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_content_links ALTER COLUMN id SET DEFAULT nextval('public.campaign_content_links_id_seq'::regclass);


--
-- Name: content_events id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_events ALTER COLUMN id SET DEFAULT nextval('public.content_events_id_seq'::regclass);


--
-- Name: dkim_keys id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dkim_keys ALTER COLUMN id SET DEFAULT nextval('public.dkim_keys_id_seq'::regclass);


--
-- Name: domain_auth id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_auth ALTER COLUMN id SET DEFAULT nextval('public.domain_auth_id_seq'::regclass);


--
-- Name: domain_reputation_snapshots id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_reputation_snapshots ALTER COLUMN id SET DEFAULT nextval('public.domain_reputation_snapshots_id_seq'::regclass);


--
-- Name: ip_pools id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ip_pools ALTER COLUMN id SET DEFAULT nextval('public.ip_pools_id_seq'::regclass);


--
-- Name: organizers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizers ALTER COLUMN id SET DEFAULT nextval('public.organizers_id_seq'::regclass);


--
-- Name: per_domain_stats id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.per_domain_stats ALTER COLUMN id SET DEFAULT nextval('public.per_domain_stats_id_seq'::regclass);


--
-- Name: send_policies id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.send_policies ALTER COLUMN id SET DEFAULT nextval('public.send_policies_id_seq'::regclass);


--
-- Name: speakers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.speakers ALTER COLUMN id SET DEFAULT nextval('public.speakers_id_seq'::regclass);


--
-- Name: sponsors id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sponsors ALTER COLUMN id SET DEFAULT nextval('public.sponsors_id_seq'::regclass);


--
-- Name: suppression_emails id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppression_emails ALTER COLUMN id SET DEFAULT nextval('public.suppression_emails_id_seq'::regclass);


--
-- Name: suppression_phones id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppression_phones ALTER COLUMN id SET DEFAULT nextval('public.suppression_phones_id_seq'::regclass);


--
-- Name: tracking_domains id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tracking_domains ALTER COLUMN id SET DEFAULT nextval('public.tracking_domains_id_seq'::regclass);


--
-- Name: warmup_plans id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.warmup_plans ALTER COLUMN id SET DEFAULT nextval('public.warmup_plans_id_seq'::regclass);


--
-- Name: account_domains account_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.account_domains
    ADD CONSTRAINT account_domains_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: agent_queue agent_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_queue
    ADD CONSTRAINT agent_queue_pkey PRIMARY KEY (id);


--
-- Name: agent_status agent_status_agent_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_status
    ADD CONSTRAINT agent_status_agent_id_unique UNIQUE (agent_id);


--
-- Name: agent_status agent_status_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_status
    ADD CONSTRAINT agent_status_pkey PRIMARY KEY (id);


--
-- Name: ai_content_generations ai_content_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_content_generations
    ADD CONSTRAINT ai_content_generations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auto_dialer_queues auto_dialer_queues_campaign_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auto_dialer_queues
    ADD CONSTRAINT auto_dialer_queues_campaign_id_unique UNIQUE (campaign_id);


--
-- Name: auto_dialer_queues auto_dialer_queues_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auto_dialer_queues
    ADD CONSTRAINT auto_dialer_queues_pkey PRIMARY KEY (id);


--
-- Name: bulk_imports bulk_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bulk_imports
    ADD CONSTRAINT bulk_imports_pkey PRIMARY KEY (id);


--
-- Name: business_hours_config business_hours_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.business_hours_config
    ADD CONSTRAINT business_hours_config_pkey PRIMARY KEY (id);


--
-- Name: call_attempts call_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_pkey PRIMARY KEY (id);


--
-- Name: call_dispositions call_dispositions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_dispositions
    ADD CONSTRAINT call_dispositions_pkey PRIMARY KEY (id);


--
-- Name: call_events call_events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_events
    ADD CONSTRAINT call_events_pkey PRIMARY KEY (id);


--
-- Name: call_jobs call_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_jobs
    ADD CONSTRAINT call_jobs_pkey PRIMARY KEY (id);


--
-- Name: call_recording_access_logs call_recording_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_recording_access_logs
    ADD CONSTRAINT call_recording_access_logs_pkey PRIMARY KEY (id);


--
-- Name: call_scripts call_scripts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_scripts
    ADD CONSTRAINT call_scripts_pkey PRIMARY KEY (id);


--
-- Name: call_sessions call_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_sessions
    ADD CONSTRAINT call_sessions_pkey PRIMARY KEY (id);


--
-- Name: calls calls_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_pkey PRIMARY KEY (id);


--
-- Name: campaign_account_stats campaign_account_stats_campaign_id_account_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_account_stats
    ADD CONSTRAINT campaign_account_stats_campaign_id_account_id_pk PRIMARY KEY (campaign_id, account_id);


--
-- Name: campaign_agent_assignments campaign_agent_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_agent_assignments
    ADD CONSTRAINT campaign_agent_assignments_pkey PRIMARY KEY (id);


--
-- Name: campaign_agents campaign_agents_campaign_id_agent_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_agents
    ADD CONSTRAINT campaign_agents_campaign_id_agent_id_pk PRIMARY KEY (campaign_id, agent_id);


--
-- Name: campaign_audience_snapshots campaign_audience_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_audience_snapshots
    ADD CONSTRAINT campaign_audience_snapshots_pkey PRIMARY KEY (id);


--
-- Name: campaign_content_links campaign_content_links_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_content_links
    ADD CONSTRAINT campaign_content_links_pkey PRIMARY KEY (id);


--
-- Name: campaign_opt_outs campaign_opt_outs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_opt_outs
    ADD CONSTRAINT campaign_opt_outs_pkey PRIMARY KEY (id);


--
-- Name: campaign_orders campaign_orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_orders
    ADD CONSTRAINT campaign_orders_order_number_unique UNIQUE (order_number);


--
-- Name: campaign_orders campaign_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_orders
    ADD CONSTRAINT campaign_orders_pkey PRIMARY KEY (id);


--
-- Name: campaign_queue campaign_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_queue
    ADD CONSTRAINT campaign_queue_pkey PRIMARY KEY (id);


--
-- Name: campaign_suppression_accounts campaign_suppression_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_suppression_accounts
    ADD CONSTRAINT campaign_suppression_accounts_pkey PRIMARY KEY (id);


--
-- Name: campaign_suppression_contacts campaign_suppression_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_suppression_contacts
    ADD CONSTRAINT campaign_suppression_contacts_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: city_reference city_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.city_reference
    ADD CONSTRAINT city_reference_pkey PRIMARY KEY (id);


--
-- Name: company_aliases company_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.company_aliases
    ADD CONSTRAINT company_aliases_pkey PRIMARY KEY (id);


--
-- Name: company_size_reference company_size_reference_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.company_size_reference
    ADD CONSTRAINT company_size_reference_code_unique UNIQUE (code);


--
-- Name: company_size_reference company_size_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.company_size_reference
    ADD CONSTRAINT company_size_reference_pkey PRIMARY KEY (id);


--
-- Name: contact_emails contact_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_emails
    ADD CONSTRAINT contact_emails_pkey PRIMARY KEY (id);


--
-- Name: contact_voicemail_tracking contact_voicemail_tracking_contact_id_campaign_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_voicemail_tracking
    ADD CONSTRAINT contact_voicemail_tracking_contact_id_campaign_id_pk PRIMARY KEY (contact_id, campaign_id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: content_approvals content_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_approvals
    ADD CONSTRAINT content_approvals_pkey PRIMARY KEY (id);


--
-- Name: content_asset_pushes content_asset_pushes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_asset_pushes
    ADD CONSTRAINT content_asset_pushes_pkey PRIMARY KEY (id);


--
-- Name: content_assets content_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_assets
    ADD CONSTRAINT content_assets_pkey PRIMARY KEY (id);


--
-- Name: content_events content_events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_events
    ADD CONSTRAINT content_events_pkey PRIMARY KEY (id);


--
-- Name: content_events content_events_uniq_key_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_events
    ADD CONSTRAINT content_events_uniq_key_unique UNIQUE (uniq_key);


--
-- Name: content_versions content_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_versions
    ADD CONSTRAINT content_versions_pkey PRIMARY KEY (id);


--
-- Name: country_reference country_reference_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.country_reference
    ADD CONSTRAINT country_reference_code_unique UNIQUE (code);


--
-- Name: country_reference country_reference_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.country_reference
    ADD CONSTRAINT country_reference_name_unique UNIQUE (name);


--
-- Name: country_reference country_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.country_reference
    ADD CONSTRAINT country_reference_pkey PRIMARY KEY (id);


--
-- Name: custom_field_definitions custom_field_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_pkey PRIMARY KEY (id);


--
-- Name: dedupe_review_queue dedupe_review_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dedupe_review_queue
    ADD CONSTRAINT dedupe_review_queue_pkey PRIMARY KEY (id);


--
-- Name: department_reference department_reference_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.department_reference
    ADD CONSTRAINT department_reference_name_unique UNIQUE (name);


--
-- Name: department_reference department_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.department_reference
    ADD CONSTRAINT department_reference_pkey PRIMARY KEY (id);


--
-- Name: dispositions dispositions_label_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dispositions
    ADD CONSTRAINT dispositions_label_unique UNIQUE (label);


--
-- Name: dispositions dispositions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dispositions
    ADD CONSTRAINT dispositions_pkey PRIMARY KEY (id);


--
-- Name: dkim_keys dkim_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dkim_keys
    ADD CONSTRAINT dkim_keys_pkey PRIMARY KEY (id);


--
-- Name: domain_auth domain_auth_domain_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_auth
    ADD CONSTRAINT domain_auth_domain_unique UNIQUE (domain);


--
-- Name: domain_auth domain_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_auth
    ADD CONSTRAINT domain_auth_pkey PRIMARY KEY (id);


--
-- Name: domain_reputation_snapshots domain_reputation_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_reputation_snapshots
    ADD CONSTRAINT domain_reputation_snapshots_pkey PRIMARY KEY (id);


--
-- Name: domain_set_contact_links domain_set_contact_links_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_set_contact_links
    ADD CONSTRAINT domain_set_contact_links_pkey PRIMARY KEY (id);


--
-- Name: domain_set_items domain_set_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_set_items
    ADD CONSTRAINT domain_set_items_pkey PRIMARY KEY (id);


--
-- Name: domain_sets domain_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_sets
    ADD CONSTRAINT domain_sets_pkey PRIMARY KEY (id);


--
-- Name: dv_account_assignments dv_account_assignments_account_id_user_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_account_assignments
    ADD CONSTRAINT dv_account_assignments_account_id_user_id_pk PRIMARY KEY (account_id, user_id);


--
-- Name: dv_accounts dv_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_accounts
    ADD CONSTRAINT dv_accounts_pkey PRIMARY KEY (id);


--
-- Name: dv_agent_filters dv_agent_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_agent_filters
    ADD CONSTRAINT dv_agent_filters_pkey PRIMARY KEY (id);


--
-- Name: dv_company_caps dv_company_caps_project_id_account_domain_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_company_caps
    ADD CONSTRAINT dv_company_caps_project_id_account_domain_pk PRIMARY KEY (project_id, account_domain);


--
-- Name: dv_deliveries dv_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_deliveries
    ADD CONSTRAINT dv_deliveries_pkey PRIMARY KEY (id);


--
-- Name: dv_exclusion_lists dv_exclusion_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_exclusion_lists
    ADD CONSTRAINT dv_exclusion_lists_pkey PRIMARY KEY (id);


--
-- Name: dv_field_constraints dv_field_constraints_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_field_constraints
    ADD CONSTRAINT dv_field_constraints_pkey PRIMARY KEY (id);


--
-- Name: dv_field_mappings dv_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_field_mappings
    ADD CONSTRAINT dv_field_mappings_pkey PRIMARY KEY (id);


--
-- Name: dv_project_agents dv_project_agents_project_id_user_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_project_agents
    ADD CONSTRAINT dv_project_agents_project_id_user_id_pk PRIMARY KEY (project_id, user_id);


--
-- Name: dv_project_exclusions dv_project_exclusions_project_id_list_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_project_exclusions
    ADD CONSTRAINT dv_project_exclusions_project_id_list_id_pk PRIMARY KEY (project_id, list_id);


--
-- Name: dv_projects dv_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_projects
    ADD CONSTRAINT dv_projects_pkey PRIMARY KEY (id);


--
-- Name: dv_records dv_records_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_records
    ADD CONSTRAINT dv_records_pkey PRIMARY KEY (id);


--
-- Name: dv_records_raw dv_records_raw_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_records_raw
    ADD CONSTRAINT dv_records_raw_pkey PRIMARY KEY (id);


--
-- Name: dv_runs dv_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_runs
    ADD CONSTRAINT dv_runs_pkey PRIMARY KEY (id);


--
-- Name: dv_selection_sets dv_selection_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_selection_sets
    ADD CONSTRAINT dv_selection_sets_pkey PRIMARY KEY (id);


--
-- Name: email_events email_events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_pkey PRIMARY KEY (id);


--
-- Name: email_messages email_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_pkey PRIMARY KEY (id);


--
-- Name: email_sends email_sends_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_sends
    ADD CONSTRAINT email_sends_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: events events_slug_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_slug_unique UNIQUE (slug);


--
-- Name: field_change_log field_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.field_change_log
    ADD CONSTRAINT field_change_log_pkey PRIMARY KEY (id);


--
-- Name: filter_field_registry filter_field_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.filter_field_registry
    ADD CONSTRAINT filter_field_registry_pkey PRIMARY KEY (id);


--
-- Name: global_dnc global_dnc_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.global_dnc
    ADD CONSTRAINT global_dnc_pkey PRIMARY KEY (id);


--
-- Name: industry_reference industry_reference_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.industry_reference
    ADD CONSTRAINT industry_reference_name_unique UNIQUE (name);


--
-- Name: industry_reference industry_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.industry_reference
    ADD CONSTRAINT industry_reference_pkey PRIMARY KEY (id);


--
-- Name: ip_pools ip_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ip_pools
    ADD CONSTRAINT ip_pools_pkey PRIMARY KEY (id);


--
-- Name: job_function_reference job_function_reference_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_function_reference
    ADD CONSTRAINT job_function_reference_name_unique UNIQUE (name);


--
-- Name: job_function_reference job_function_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_function_reference
    ADD CONSTRAINT job_function_reference_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: lists lists_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_pkey PRIMARY KEY (id);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: news news_slug_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_slug_unique UNIQUE (slug);


--
-- Name: order_assets order_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_assets
    ADD CONSTRAINT order_assets_pkey PRIMARY KEY (id);


--
-- Name: order_audience_snapshots order_audience_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_audience_snapshots
    ADD CONSTRAINT order_audience_snapshots_pkey PRIMARY KEY (id);


--
-- Name: order_campaign_links order_campaign_links_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_campaign_links
    ADD CONSTRAINT order_campaign_links_pkey PRIMARY KEY (id);


--
-- Name: order_qualification_questions order_qualification_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_qualification_questions
    ADD CONSTRAINT order_qualification_questions_pkey PRIMARY KEY (id);


--
-- Name: organizers organizers_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizers
    ADD CONSTRAINT organizers_name_unique UNIQUE (name);


--
-- Name: organizers organizers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizers
    ADD CONSTRAINT organizers_pkey PRIMARY KEY (id);


--
-- Name: per_domain_stats per_domain_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.per_domain_stats
    ADD CONSTRAINT per_domain_stats_pkey PRIMARY KEY (id);


--
-- Name: qualification_responses qualification_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.qualification_responses
    ADD CONSTRAINT qualification_responses_pkey PRIMARY KEY (id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: resources resources_slug_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_slug_unique UNIQUE (slug);


--
-- Name: revenue_range_reference revenue_range_reference_label_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.revenue_range_reference
    ADD CONSTRAINT revenue_range_reference_label_unique UNIQUE (label);


--
-- Name: revenue_range_reference revenue_range_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.revenue_range_reference
    ADD CONSTRAINT revenue_range_reference_pkey PRIMARY KEY (id);


--
-- Name: saved_filters saved_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saved_filters
    ADD CONSTRAINT saved_filters_pkey PRIMARY KEY (id);


--
-- Name: segments segments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.segments
    ADD CONSTRAINT segments_pkey PRIMARY KEY (id);


--
-- Name: selection_contexts selection_contexts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.selection_contexts
    ADD CONSTRAINT selection_contexts_pkey PRIMARY KEY (id);


--
-- Name: send_policies send_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.send_policies
    ADD CONSTRAINT send_policies_pkey PRIMARY KEY (id);


--
-- Name: sender_profiles sender_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sender_profiles
    ADD CONSTRAINT sender_profiles_pkey PRIMARY KEY (id);


--
-- Name: seniority_level_reference seniority_level_reference_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.seniority_level_reference
    ADD CONSTRAINT seniority_level_reference_name_unique UNIQUE (name);


--
-- Name: seniority_level_reference seniority_level_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.seniority_level_reference
    ADD CONSTRAINT seniority_level_reference_pkey PRIMARY KEY (id);


--
-- Name: sip_trunk_configs sip_trunk_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sip_trunk_configs
    ADD CONSTRAINT sip_trunk_configs_pkey PRIMARY KEY (id);


--
-- Name: social_posts social_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_pkey PRIMARY KEY (id);


--
-- Name: softphone_profiles softphone_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.softphone_profiles
    ADD CONSTRAINT softphone_profiles_pkey PRIMARY KEY (id);


--
-- Name: softphone_profiles softphone_profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.softphone_profiles
    ADD CONSTRAINT softphone_profiles_user_id_unique UNIQUE (user_id);


--
-- Name: speakers speakers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT speakers_pkey PRIMARY KEY (id);


--
-- Name: sponsors sponsors_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_name_unique UNIQUE (name);


--
-- Name: sponsors sponsors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_pkey PRIMARY KEY (id);


--
-- Name: state_reference state_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.state_reference
    ADD CONSTRAINT state_reference_pkey PRIMARY KEY (id);


--
-- Name: suppression_emails suppression_emails_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppression_emails
    ADD CONSTRAINT suppression_emails_email_unique UNIQUE (email);


--
-- Name: suppression_emails suppression_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppression_emails
    ADD CONSTRAINT suppression_emails_pkey PRIMARY KEY (id);


--
-- Name: suppression_phones suppression_phones_phone_e164_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppression_phones
    ADD CONSTRAINT suppression_phones_phone_e164_unique UNIQUE (phone_e164);


--
-- Name: suppression_phones suppression_phones_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppression_phones
    ADD CONSTRAINT suppression_phones_pkey PRIMARY KEY (id);


--
-- Name: technology_reference technology_reference_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.technology_reference
    ADD CONSTRAINT technology_reference_name_unique UNIQUE (name);


--
-- Name: technology_reference technology_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.technology_reference
    ADD CONSTRAINT technology_reference_pkey PRIMARY KEY (id);


--
-- Name: tracking_domains tracking_domains_cname_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tracking_domains
    ADD CONSTRAINT tracking_domains_cname_unique UNIQUE (cname);


--
-- Name: tracking_domains tracking_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tracking_domains
    ADD CONSTRAINT tracking_domains_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: verification_audit_log verification_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_audit_log
    ADD CONSTRAINT verification_audit_log_pkey PRIMARY KEY (id);


--
-- Name: verification_campaigns verification_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_campaigns
    ADD CONSTRAINT verification_campaigns_pkey PRIMARY KEY (id);


--
-- Name: verification_contacts verification_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_contacts
    ADD CONSTRAINT verification_contacts_pkey PRIMARY KEY (id);


--
-- Name: verification_email_validation_jobs verification_email_validation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_email_validation_jobs
    ADD CONSTRAINT verification_email_validation_jobs_pkey PRIMARY KEY (id);


--
-- Name: verification_lead_submissions verification_lead_submissions_contact_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_lead_submissions
    ADD CONSTRAINT verification_lead_submissions_contact_id_unique UNIQUE (contact_id);


--
-- Name: verification_lead_submissions verification_lead_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_lead_submissions
    ADD CONSTRAINT verification_lead_submissions_pkey PRIMARY KEY (id);


--
-- Name: verification_suppression_list verification_suppression_list_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_suppression_list
    ADD CONSTRAINT verification_suppression_list_pkey PRIMARY KEY (id);


--
-- Name: verification_upload_jobs verification_upload_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_upload_jobs
    ADD CONSTRAINT verification_upload_jobs_pkey PRIMARY KEY (id);


--
-- Name: voicemail_assets voicemail_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.voicemail_assets
    ADD CONSTRAINT voicemail_assets_pkey PRIMARY KEY (id);


--
-- Name: warmup_plans warmup_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.warmup_plans
    ADD CONSTRAINT warmup_plans_pkey PRIMARY KEY (id);


--
-- Name: account_domains_account_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX account_domains_account_idx ON public.account_domains USING btree (account_id);


--
-- Name: account_domains_domain_normalized_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX account_domains_domain_normalized_unique_idx ON public.account_domains USING btree (domain_normalized) WHERE (deleted_at IS NULL);


--
-- Name: accounts_canonical_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX accounts_canonical_name_idx ON public.accounts USING btree (canonical_name);


--
-- Name: accounts_domain_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX accounts_domain_idx ON public.accounts USING btree (domain);


--
-- Name: accounts_domain_normalized_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX accounts_domain_normalized_unique_idx ON public.accounts USING btree (domain_normalized) WHERE (deleted_at IS NULL);


--
-- Name: accounts_name_city_country_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX accounts_name_city_country_unique_idx ON public.accounts USING btree (name_normalized, hq_city, hq_country) WHERE ((deleted_at IS NULL) AND (domain_normalized IS NULL));


--
-- Name: accounts_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX accounts_name_idx ON public.accounts USING btree (name);


--
-- Name: accounts_owner_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX accounts_owner_idx ON public.accounts USING btree (owner_id);


--
-- Name: accounts_specialties_gin_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX accounts_specialties_gin_idx ON public.accounts USING gin (linkedin_specialties);


--
-- Name: accounts_tags_gin_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX accounts_tags_gin_idx ON public.accounts USING gin (tags);


--
-- Name: accounts_tech_stack_gin_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX accounts_tech_stack_gin_idx ON public.accounts USING gin (tech_stack);


--
-- Name: activity_log_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX activity_log_created_at_idx ON public.activity_log USING btree (created_at);


--
-- Name: activity_log_entity_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX activity_log_entity_idx ON public.activity_log USING btree (entity_type, entity_id);


--
-- Name: activity_log_event_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX activity_log_event_type_idx ON public.activity_log USING btree (event_type);


--
-- Name: agent_queue_agent_campaign_contact_uniq; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX agent_queue_agent_campaign_contact_uniq ON public.agent_queue USING btree (agent_id, campaign_id, contact_id);


--
-- Name: agent_queue_agent_state_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX agent_queue_agent_state_idx ON public.agent_queue USING btree (agent_id, queue_state);


--
-- Name: agent_queue_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX agent_queue_campaign_idx ON public.agent_queue USING btree (campaign_id);


--
-- Name: agent_queue_contact_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX agent_queue_contact_idx ON public.agent_queue USING btree (contact_id);


--
-- Name: agent_queue_pull_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX agent_queue_pull_idx ON public.agent_queue USING btree (campaign_id, queue_state, priority, scheduled_for);


--
-- Name: agent_status_agent_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX agent_status_agent_idx ON public.agent_status USING btree (agent_id);


--
-- Name: agent_status_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX agent_status_campaign_idx ON public.agent_status USING btree (campaign_id);


--
-- Name: agent_status_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX agent_status_status_idx ON public.agent_status USING btree (status);


--
-- Name: ai_content_generations_asset_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ai_content_generations_asset_id_idx ON public.ai_content_generations USING btree (asset_id);


--
-- Name: ai_content_generations_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ai_content_generations_created_at_idx ON public.ai_content_generations USING btree (created_at);


--
-- Name: ai_content_generations_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ai_content_generations_user_idx ON public.ai_content_generations USING btree (user_id);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_entity_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_entity_idx ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: audit_logs_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_user_idx ON public.audit_logs USING btree (user_id);


--
-- Name: auto_dialer_queues_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX auto_dialer_queues_active_idx ON public.auto_dialer_queues USING btree (is_active);


--
-- Name: auto_dialer_queues_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX auto_dialer_queues_campaign_idx ON public.auto_dialer_queues USING btree (campaign_id);


--
-- Name: auto_dialer_queues_vm_asset_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX auto_dialer_queues_vm_asset_idx ON public.auto_dialer_queues USING btree (vm_asset_id);


--
-- Name: bulk_imports_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX bulk_imports_status_idx ON public.bulk_imports USING btree (status);


--
-- Name: business_hours_config_timezone_day_uniq; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX business_hours_config_timezone_day_uniq ON public.business_hours_config USING btree (timezone, day_of_week);


--
-- Name: business_hours_config_timezone_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX business_hours_config_timezone_idx ON public.business_hours_config USING btree (timezone);


--
-- Name: call_attempts_agent_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_attempts_agent_idx ON public.call_attempts USING btree (agent_id);


--
-- Name: call_attempts_amd_result_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_attempts_amd_result_idx ON public.call_attempts USING btree (amd_result);


--
-- Name: call_attempts_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_attempts_campaign_idx ON public.call_attempts USING btree (campaign_id);


--
-- Name: call_attempts_contact_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_attempts_contact_idx ON public.call_attempts USING btree (contact_id);


--
-- Name: call_attempts_vm_asset_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_attempts_vm_asset_idx ON public.call_attempts USING btree (vm_asset_id);


--
-- Name: call_dispositions_call_session_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_dispositions_call_session_idx ON public.call_dispositions USING btree (call_session_id);


--
-- Name: call_dispositions_disposition_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_dispositions_disposition_idx ON public.call_dispositions USING btree (disposition_id);


--
-- Name: call_events_attempt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_events_attempt_idx ON public.call_events USING btree (attempt_id);


--
-- Name: call_events_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_events_type_idx ON public.call_events USING btree (type);


--
-- Name: call_jobs_account_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_jobs_account_idx ON public.call_jobs USING btree (account_id);


--
-- Name: call_jobs_agent_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_jobs_agent_idx ON public.call_jobs USING btree (agent_id);


--
-- Name: call_jobs_campaign_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_jobs_campaign_status_idx ON public.call_jobs USING btree (campaign_id, status);


--
-- Name: call_jobs_contact_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_jobs_contact_idx ON public.call_jobs USING btree (contact_id);


--
-- Name: call_jobs_scheduled_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_jobs_scheduled_at_idx ON public.call_jobs USING btree (scheduled_at);


--
-- Name: call_recording_access_logs_action_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_recording_access_logs_action_idx ON public.call_recording_access_logs USING btree (action);


--
-- Name: call_recording_access_logs_attempt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_recording_access_logs_attempt_idx ON public.call_recording_access_logs USING btree (call_attempt_id);


--
-- Name: call_recording_access_logs_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_recording_access_logs_user_idx ON public.call_recording_access_logs USING btree (user_id);


--
-- Name: call_sessions_call_job_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_sessions_call_job_idx ON public.call_sessions USING btree (call_job_id);


--
-- Name: call_sessions_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_sessions_status_idx ON public.call_sessions USING btree (status);


--
-- Name: call_sessions_telnyx_call_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX call_sessions_telnyx_call_idx ON public.call_sessions USING btree (telnyx_call_id);


--
-- Name: calls_agent_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX calls_agent_idx ON public.calls USING btree (agent_id);


--
-- Name: calls_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX calls_campaign_idx ON public.calls USING btree (campaign_id);


--
-- Name: calls_contact_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX calls_contact_idx ON public.calls USING btree (contact_id);


--
-- Name: calls_queue_item_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX calls_queue_item_idx ON public.calls USING btree (queue_item_id);


--
-- Name: campaign_agent_assignments_active_agent_uniq; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX campaign_agent_assignments_active_agent_uniq ON public.campaign_agent_assignments USING btree (agent_id) WHERE (is_active = true);


--
-- Name: campaign_agent_assignments_agent_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_agent_assignments_agent_idx ON public.campaign_agent_assignments USING btree (agent_id);


--
-- Name: campaign_agent_assignments_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_agent_assignments_campaign_idx ON public.campaign_agent_assignments USING btree (campaign_id);


--
-- Name: campaign_agent_assignments_uniq; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX campaign_agent_assignments_uniq ON public.campaign_agent_assignments USING btree (campaign_id, agent_id);


--
-- Name: campaign_agents_agent_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_agents_agent_idx ON public.campaign_agents USING btree (agent_id);


--
-- Name: campaign_agents_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_agents_campaign_idx ON public.campaign_agents USING btree (campaign_id);


--
-- Name: campaign_audience_snapshots_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_audience_snapshots_campaign_idx ON public.campaign_audience_snapshots USING btree (campaign_id);


--
-- Name: campaign_content_links_content_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_content_links_content_id_idx ON public.campaign_content_links USING btree (content_id);


--
-- Name: campaign_content_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX campaign_content_unique_idx ON public.campaign_content_links USING btree (campaign_id, content_type, content_id);


--
-- Name: campaign_opt_outs_campaign_contact_uniq; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX campaign_opt_outs_campaign_contact_uniq ON public.campaign_opt_outs USING btree (campaign_id, contact_id);


--
-- Name: campaign_opt_outs_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_opt_outs_campaign_idx ON public.campaign_opt_outs USING btree (campaign_id);


--
-- Name: campaign_opt_outs_contact_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_opt_outs_contact_idx ON public.campaign_opt_outs USING btree (contact_id);


--
-- Name: campaign_orders_client_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_orders_client_idx ON public.campaign_orders USING btree (client_user_id);


--
-- Name: campaign_orders_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_orders_status_idx ON public.campaign_orders USING btree (status);


--
-- Name: campaign_queue_active_uniq; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX campaign_queue_active_uniq ON public.campaign_queue USING btree (campaign_id, contact_id) WHERE (status <> ALL (ARRAY['done'::public.queue_status, 'removed'::public.queue_status]));


--
-- Name: campaign_queue_agent_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_queue_agent_idx ON public.campaign_queue USING btree (agent_id);


--
-- Name: campaign_queue_camp_acct_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_queue_camp_acct_idx ON public.campaign_queue USING btree (campaign_id, account_id);


--
-- Name: campaign_queue_camp_contact_uniq; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX campaign_queue_camp_contact_uniq ON public.campaign_queue USING btree (campaign_id, contact_id);


--
-- Name: campaign_queue_camp_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_queue_camp_status_idx ON public.campaign_queue USING btree (campaign_id, status);


--
-- Name: campaign_queue_pull_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_queue_pull_idx ON public.campaign_queue USING btree (campaign_id, status, next_attempt_at, priority);


--
-- Name: campaign_suppression_accounts_account_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_suppression_accounts_account_idx ON public.campaign_suppression_accounts USING btree (account_id);


--
-- Name: campaign_suppression_accounts_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_suppression_accounts_campaign_idx ON public.campaign_suppression_accounts USING btree (campaign_id, account_id);


--
-- Name: campaign_suppression_accounts_unique; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX campaign_suppression_accounts_unique ON public.campaign_suppression_accounts USING btree (campaign_id, account_id);


--
-- Name: campaign_suppression_contacts_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_suppression_contacts_campaign_idx ON public.campaign_suppression_contacts USING btree (campaign_id, contact_id);


--
-- Name: campaign_suppression_contacts_contact_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaign_suppression_contacts_contact_idx ON public.campaign_suppression_contacts USING btree (contact_id);


--
-- Name: campaign_suppression_contacts_unique; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX campaign_suppression_contacts_unique ON public.campaign_suppression_contacts USING btree (campaign_id, contact_id);


--
-- Name: campaigns_dial_mode_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaigns_dial_mode_idx ON public.campaigns USING btree (dial_mode);


--
-- Name: campaigns_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaigns_status_idx ON public.campaigns USING btree (status);


--
-- Name: campaigns_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX campaigns_type_idx ON public.campaigns USING btree (type);


--
-- Name: city_reference_country_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX city_reference_country_id_idx ON public.city_reference USING btree (country_id);


--
-- Name: city_reference_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX city_reference_name_idx ON public.city_reference USING btree (name);


--
-- Name: city_reference_sort_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX city_reference_sort_order_idx ON public.city_reference USING btree (sort_order);


--
-- Name: city_reference_state_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX city_reference_state_id_idx ON public.city_reference USING btree (state_id);


--
-- Name: company_aliases_alias_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX company_aliases_alias_idx ON public.company_aliases USING btree (alias);


--
-- Name: company_aliases_canonical_alias_uniq; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX company_aliases_canonical_alias_uniq ON public.company_aliases USING btree (canonical_name, alias);


--
-- Name: company_size_reference_code_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX company_size_reference_code_idx ON public.company_size_reference USING btree (code);


--
-- Name: company_size_reference_sort_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX company_size_reference_sort_order_idx ON public.company_size_reference USING btree (sort_order);


--
-- Name: contact_emails_contact_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX contact_emails_contact_idx ON public.contact_emails USING btree (contact_id);


--
-- Name: contact_emails_email_normalized_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX contact_emails_email_normalized_unique_idx ON public.contact_emails USING btree (email_normalized) WHERE (deleted_at IS NULL);


--
-- Name: contact_vm_tracking_last_vm_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX contact_vm_tracking_last_vm_idx ON public.contact_voicemail_tracking USING btree (last_vm_at);


--
-- Name: contacts_account_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX contacts_account_idx ON public.contacts USING btree (account_id);


--
-- Name: contacts_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX contacts_email_idx ON public.contacts USING btree (email);


--
-- Name: contacts_email_normalized_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX contacts_email_normalized_unique_idx ON public.contacts USING btree (email_normalized) WHERE (deleted_at IS NULL);


--
-- Name: contacts_owner_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX contacts_owner_idx ON public.contacts USING btree (owner_id);


--
-- Name: contacts_phone_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX contacts_phone_idx ON public.contacts USING btree (direct_phone_e164);


--
-- Name: contacts_tags_gin_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX contacts_tags_gin_idx ON public.contacts USING gin (tags);


--
-- Name: contacts_timezone_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX contacts_timezone_idx ON public.contacts USING btree (timezone);


--
-- Name: content_approvals_asset_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_approvals_asset_id_idx ON public.content_approvals USING btree (asset_id);


--
-- Name: content_approvals_reviewer_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_approvals_reviewer_idx ON public.content_approvals USING btree (reviewer_id);


--
-- Name: content_asset_pushes_asset_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_asset_pushes_asset_id_idx ON public.content_asset_pushes USING btree (asset_id);


--
-- Name: content_asset_pushes_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_asset_pushes_status_idx ON public.content_asset_pushes USING btree (status);


--
-- Name: content_asset_pushes_target_url_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_asset_pushes_target_url_idx ON public.content_asset_pushes USING btree (target_url);


--
-- Name: content_assets_approval_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_assets_approval_status_idx ON public.content_assets USING btree (approval_status);


--
-- Name: content_assets_asset_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_assets_asset_type_idx ON public.content_assets USING btree (asset_type);


--
-- Name: content_assets_owner_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_assets_owner_idx ON public.content_assets USING btree (owner_id);


--
-- Name: content_events_contact_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_events_contact_id_idx ON public.content_events USING btree (contact_id);


--
-- Name: content_events_content_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_events_content_id_idx ON public.content_events USING btree (content_id);


--
-- Name: content_events_event_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_events_event_name_idx ON public.content_events USING btree (event_name);


--
-- Name: content_events_ts_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_events_ts_idx ON public.content_events USING btree (ts);


--
-- Name: content_versions_asset_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_versions_asset_id_idx ON public.content_versions USING btree (asset_id);


--
-- Name: content_versions_version_number_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX content_versions_version_number_idx ON public.content_versions USING btree (asset_id, version_number);


--
-- Name: country_reference_code_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX country_reference_code_idx ON public.country_reference USING btree (code);


--
-- Name: country_reference_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX country_reference_name_idx ON public.country_reference USING btree (name);


--
-- Name: country_reference_sort_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX country_reference_sort_order_idx ON public.country_reference USING btree (sort_order);


--
-- Name: custom_field_definitions_entity_key_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX custom_field_definitions_entity_key_idx ON public.custom_field_definitions USING btree (entity_type, field_key);


--
-- Name: custom_field_definitions_entity_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX custom_field_definitions_entity_type_idx ON public.custom_field_definitions USING btree (entity_type);


--
-- Name: dedupe_review_queue_entity_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX dedupe_review_queue_entity_type_idx ON public.dedupe_review_queue USING btree (entity_type);


--
-- Name: dedupe_review_queue_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX dedupe_review_queue_status_idx ON public.dedupe_review_queue USING btree (status);


--
-- Name: department_reference_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX department_reference_name_idx ON public.department_reference USING btree (name);


--
-- Name: department_reference_sort_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX department_reference_sort_order_idx ON public.department_reference USING btree (sort_order);


--
-- Name: dispositions_label_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX dispositions_label_idx ON public.dispositions USING btree (label);


--
-- Name: dispositions_system_action_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX dispositions_system_action_idx ON public.dispositions USING btree (system_action);


--
-- Name: domain_set_contact_links_contact_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX domain_set_contact_links_contact_id_idx ON public.domain_set_contact_links USING btree (contact_id);


--
-- Name: domain_set_contact_links_domain_set_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX domain_set_contact_links_domain_set_id_idx ON public.domain_set_contact_links USING btree (domain_set_id);


--
-- Name: domain_set_items_account_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX domain_set_items_account_id_idx ON public.domain_set_items USING btree (account_id);


--
-- Name: domain_set_items_domain_set_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX domain_set_items_domain_set_id_idx ON public.domain_set_items USING btree (domain_set_id);


--
-- Name: domain_set_items_normalized_domain_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX domain_set_items_normalized_domain_idx ON public.domain_set_items USING btree (normalized_domain);


--
-- Name: domain_sets_owner_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX domain_sets_owner_id_idx ON public.domain_sets USING btree (owner_id);


--
-- Name: domain_sets_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX domain_sets_status_idx ON public.domain_sets USING btree (status);


--
-- Name: dv_accounts_project_domain_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX dv_accounts_project_domain_idx ON public.dv_accounts USING btree (project_id, account_domain);


--
-- Name: dv_records_dedupe_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX dv_records_dedupe_idx ON public.dv_records USING btree (dedupe_hash);


--
-- Name: dv_records_project_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX dv_records_project_status_idx ON public.dv_records USING btree (project_id, status);


--
-- Name: dv_records_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX dv_records_status_idx ON public.dv_records USING btree (status);


--
-- Name: email_events_send_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_events_send_idx ON public.email_events USING btree (send_id);


--
-- Name: email_events_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_events_type_idx ON public.email_events USING btree (type);


--
-- Name: email_messages_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_messages_campaign_idx ON public.email_messages USING btree (campaign_id);


--
-- Name: email_messages_contact_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_messages_contact_idx ON public.email_messages USING btree (contact_id);


--
-- Name: email_messages_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_messages_status_idx ON public.email_messages USING btree (status);


--
-- Name: email_sends_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_sends_campaign_idx ON public.email_sends USING btree (campaign_id);


--
-- Name: email_sends_contact_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_sends_contact_idx ON public.email_sends USING btree (contact_id);


--
-- Name: email_sends_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_sends_status_idx ON public.email_sends USING btree (status);


--
-- Name: events_community_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX events_community_idx ON public.events USING btree (community);


--
-- Name: events_event_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX events_event_type_idx ON public.events USING btree (event_type);


--
-- Name: events_slug_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX events_slug_idx ON public.events USING btree (slug);


--
-- Name: events_start_iso_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX events_start_iso_idx ON public.events USING btree (start_iso);


--
-- Name: events_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX events_status_idx ON public.events USING btree (status);


--
-- Name: field_change_log_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX field_change_log_created_at_idx ON public.field_change_log USING btree (created_at);


--
-- Name: field_change_log_entity_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX field_change_log_entity_idx ON public.field_change_log USING btree (entity_type, entity_id);


--
-- Name: filter_field_registry_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX filter_field_registry_category_idx ON public.filter_field_registry USING btree (category);


--
-- Name: filter_field_registry_entity_key_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX filter_field_registry_entity_key_idx ON public.filter_field_registry USING btree (entity, key);


--
-- Name: filter_field_registry_visible_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX filter_field_registry_visible_idx ON public.filter_field_registry USING btree (visible_in_filters);


--
-- Name: global_dnc_contact_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX global_dnc_contact_idx ON public.global_dnc USING btree (contact_id);


--
-- Name: global_dnc_contact_phone_uniq; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX global_dnc_contact_phone_uniq ON public.global_dnc USING btree (contact_id, phone_e164);


--
-- Name: global_dnc_phone_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX global_dnc_phone_idx ON public.global_dnc USING btree (phone_e164);


--
-- Name: industry_reference_is_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX industry_reference_is_active_idx ON public.industry_reference USING btree (is_active);


--
-- Name: industry_reference_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX industry_reference_name_idx ON public.industry_reference USING btree (name);


--
-- Name: job_function_reference_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX job_function_reference_name_idx ON public.job_function_reference USING btree (name);


--
-- Name: job_function_reference_sort_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX job_function_reference_sort_order_idx ON public.job_function_reference USING btree (sort_order);


--
-- Name: leads_call_attempt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX leads_call_attempt_idx ON public.leads USING btree (call_attempt_id);


--
-- Name: leads_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX leads_campaign_idx ON public.leads USING btree (campaign_id);


--
-- Name: leads_qa_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX leads_qa_status_idx ON public.leads USING btree (qa_status);


--
-- Name: lists_entity_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lists_entity_type_idx ON public.lists USING btree (entity_type);


--
-- Name: lists_owner_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lists_owner_id_idx ON public.lists USING btree (owner_id);


--
-- Name: lists_source_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX lists_source_type_idx ON public.lists USING btree (source_type);


--
-- Name: news_community_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX news_community_idx ON public.news USING btree (community);


--
-- Name: news_published_iso_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX news_published_iso_idx ON public.news USING btree (published_iso);


--
-- Name: news_slug_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX news_slug_idx ON public.news USING btree (slug);


--
-- Name: news_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX news_status_idx ON public.news USING btree (status);


--
-- Name: order_campaign_links_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX order_campaign_links_campaign_idx ON public.order_campaign_links USING btree (campaign_id);


--
-- Name: order_campaign_links_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX order_campaign_links_order_idx ON public.order_campaign_links USING btree (order_id);


--
-- Name: organizers_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX organizers_name_idx ON public.organizers USING btree (name);


--
-- Name: qualification_responses_attempt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX qualification_responses_attempt_idx ON public.qualification_responses USING btree (attempt_id);


--
-- Name: qualification_responses_lead_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX qualification_responses_lead_idx ON public.qualification_responses USING btree (lead_id);


--
-- Name: resources_community_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX resources_community_idx ON public.resources USING btree (community);


--
-- Name: resources_resource_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX resources_resource_type_idx ON public.resources USING btree (resource_type);


--
-- Name: resources_slug_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX resources_slug_idx ON public.resources USING btree (slug);


--
-- Name: resources_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX resources_status_idx ON public.resources USING btree (status);


--
-- Name: revenue_range_reference_label_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX revenue_range_reference_label_idx ON public.revenue_range_reference USING btree (label);


--
-- Name: revenue_range_reference_sort_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX revenue_range_reference_sort_order_idx ON public.revenue_range_reference USING btree (sort_order);


--
-- Name: saved_filters_entity_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX saved_filters_entity_type_idx ON public.saved_filters USING btree (entity_type);


--
-- Name: saved_filters_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX saved_filters_user_idx ON public.saved_filters USING btree (user_id);


--
-- Name: segments_entity_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX segments_entity_type_idx ON public.segments USING btree (entity_type);


--
-- Name: segments_is_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX segments_is_active_idx ON public.segments USING btree (is_active);


--
-- Name: segments_owner_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX segments_owner_id_idx ON public.segments USING btree (owner_id);


--
-- Name: selection_contexts_expires_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX selection_contexts_expires_idx ON public.selection_contexts USING btree (expires_at);


--
-- Name: selection_contexts_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX selection_contexts_user_idx ON public.selection_contexts USING btree (user_id);


--
-- Name: seniority_level_reference_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX seniority_level_reference_name_idx ON public.seniority_level_reference USING btree (name);


--
-- Name: seniority_level_reference_sort_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX seniority_level_reference_sort_order_idx ON public.seniority_level_reference USING btree (sort_order);


--
-- Name: sip_trunk_configs_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX sip_trunk_configs_active_idx ON public.sip_trunk_configs USING btree (is_active);


--
-- Name: sip_trunk_configs_default_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX sip_trunk_configs_default_idx ON public.sip_trunk_configs USING btree (is_default);


--
-- Name: social_posts_owner_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX social_posts_owner_idx ON public.social_posts USING btree (owner_id);


--
-- Name: social_posts_platform_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX social_posts_platform_idx ON public.social_posts USING btree (platform);


--
-- Name: social_posts_scheduled_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX social_posts_scheduled_at_idx ON public.social_posts USING btree (scheduled_at);


--
-- Name: social_posts_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX social_posts_status_idx ON public.social_posts USING btree (status);


--
-- Name: softphone_profiles_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX softphone_profiles_user_idx ON public.softphone_profiles USING btree (user_id);


--
-- Name: speakers_external_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX speakers_external_id_idx ON public.speakers USING btree (external_id);


--
-- Name: speakers_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX speakers_name_idx ON public.speakers USING btree (name);


--
-- Name: sponsors_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX sponsors_name_idx ON public.sponsors USING btree (name);


--
-- Name: state_reference_code_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX state_reference_code_idx ON public.state_reference USING btree (code);


--
-- Name: state_reference_country_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX state_reference_country_id_idx ON public.state_reference USING btree (country_id);


--
-- Name: state_reference_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX state_reference_name_idx ON public.state_reference USING btree (name);


--
-- Name: state_reference_sort_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX state_reference_sort_order_idx ON public.state_reference USING btree (sort_order);


--
-- Name: state_reference_unique_name_country; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX state_reference_unique_name_country ON public.state_reference USING btree (name, country_id);


--
-- Name: suppression_emails_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX suppression_emails_idx ON public.suppression_emails USING btree (email);


--
-- Name: suppression_phones_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX suppression_phones_idx ON public.suppression_phones USING btree (phone_e164);


--
-- Name: technology_reference_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX technology_reference_category_idx ON public.technology_reference USING btree (category);


--
-- Name: technology_reference_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX technology_reference_name_idx ON public.technology_reference USING btree (name);


--
-- Name: user_roles_user_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX user_roles_user_id_idx ON public.user_roles USING btree (user_id);


--
-- Name: user_roles_user_role_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX user_roles_user_role_idx ON public.user_roles USING btree (user_id, role);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_username_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_username_idx ON public.users USING btree (username);


--
-- Name: verification_audit_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_audit_at_idx ON public.verification_audit_log USING btree (at);


--
-- Name: verification_audit_entity_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_audit_entity_idx ON public.verification_audit_log USING btree (entity_type, entity_id);


--
-- Name: verification_campaigns_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_campaigns_name_idx ON public.verification_campaigns USING btree (name);


--
-- Name: verification_contacts_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_contacts_campaign_idx ON public.verification_contacts USING btree (campaign_id);


--
-- Name: verification_contacts_cav_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_contacts_cav_id_idx ON public.verification_contacts USING btree (cav_id);


--
-- Name: verification_contacts_deleted_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_contacts_deleted_idx ON public.verification_contacts USING btree (deleted);


--
-- Name: verification_contacts_eligibility_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_contacts_eligibility_idx ON public.verification_contacts USING btree (eligibility_status);


--
-- Name: verification_contacts_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_contacts_email_idx ON public.verification_contacts USING btree (email);


--
-- Name: verification_contacts_email_lower_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_contacts_email_lower_idx ON public.verification_contacts USING btree (email_lower);


--
-- Name: verification_contacts_norm_keys_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_contacts_norm_keys_idx ON public.verification_contacts USING btree (first_name_norm, last_name_norm, company_key, contact_country_key);


--
-- Name: verification_contacts_suppressed_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_contacts_suppressed_idx ON public.verification_contacts USING btree (suppressed);


--
-- Name: verification_email_validation_jobs_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_email_validation_jobs_campaign_idx ON public.verification_email_validation_jobs USING btree (campaign_id);


--
-- Name: verification_email_validation_jobs_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_email_validation_jobs_created_at_idx ON public.verification_email_validation_jobs USING btree (created_at);


--
-- Name: verification_email_validation_jobs_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_email_validation_jobs_status_idx ON public.verification_email_validation_jobs USING btree (status);


--
-- Name: verification_email_validations_cache_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_email_validations_cache_idx ON public.verification_email_validations USING btree (email_lower, checked_at);


--
-- Name: verification_submissions_campaign_account_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_submissions_campaign_account_idx ON public.verification_lead_submissions USING btree (campaign_id, account_id);


--
-- Name: verification_suppression_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_suppression_campaign_idx ON public.verification_suppression_list USING btree (campaign_id);


--
-- Name: verification_suppression_cav_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_suppression_cav_id_idx ON public.verification_suppression_list USING btree (cav_id);


--
-- Name: verification_suppression_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_suppression_email_idx ON public.verification_suppression_list USING btree (email_lower);


--
-- Name: verification_upload_jobs_campaign_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_upload_jobs_campaign_idx ON public.verification_upload_jobs USING btree (campaign_id);


--
-- Name: verification_upload_jobs_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_upload_jobs_created_at_idx ON public.verification_upload_jobs USING btree (created_at);


--
-- Name: verification_upload_jobs_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX verification_upload_jobs_status_idx ON public.verification_upload_jobs USING btree (status);


--
-- Name: voicemail_assets_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX voicemail_assets_active_idx ON public.voicemail_assets USING btree (is_active);


--
-- Name: voicemail_assets_owner_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX voicemail_assets_owner_idx ON public.voicemail_assets USING btree (owner_id);


--
-- Name: verification_contacts trg_relink_cav_by_tuple; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trg_relink_cav_by_tuple BEFORE INSERT OR UPDATE ON public.verification_contacts FOR EACH ROW EXECUTE FUNCTION public.relink_cav_by_tuple();


--
-- Name: verification_contacts trg_set_email_lower_vc; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trg_set_email_lower_vc BEFORE INSERT OR UPDATE OF email ON public.verification_contacts FOR EACH ROW EXECUTE FUNCTION public.set_email_lower_vc();


--
-- Name: account_domains account_domains_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.account_domains
    ADD CONSTRAINT account_domains_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: accounts accounts_industry_ai_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_industry_ai_reviewed_by_users_id_fk FOREIGN KEY (industry_ai_reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: accounts accounts_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: accounts accounts_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: activity_log activity_log_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: agent_queue agent_queue_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_queue
    ADD CONSTRAINT agent_queue_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: agent_queue agent_queue_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_queue
    ADD CONSTRAINT agent_queue_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: agent_queue agent_queue_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_queue
    ADD CONSTRAINT agent_queue_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: agent_queue agent_queue_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_queue
    ADD CONSTRAINT agent_queue_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: agent_queue agent_queue_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_queue
    ADD CONSTRAINT agent_queue_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: agent_queue agent_queue_locked_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_queue
    ADD CONSTRAINT agent_queue_locked_by_users_id_fk FOREIGN KEY (locked_by) REFERENCES public.users(id);


--
-- Name: agent_queue agent_queue_released_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_queue
    ADD CONSTRAINT agent_queue_released_by_users_id_fk FOREIGN KEY (released_by) REFERENCES public.users(id);


--
-- Name: agent_status agent_status_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_status
    ADD CONSTRAINT agent_status_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: agent_status agent_status_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_status
    ADD CONSTRAINT agent_status_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: agent_status agent_status_current_call_id_call_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_status
    ADD CONSTRAINT agent_status_current_call_id_call_sessions_id_fk FOREIGN KEY (current_call_id) REFERENCES public.call_sessions(id) ON DELETE SET NULL;


--
-- Name: ai_content_generations ai_content_generations_asset_id_content_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_content_generations
    ADD CONSTRAINT ai_content_generations_asset_id_content_assets_id_fk FOREIGN KEY (asset_id) REFERENCES public.content_assets(id) ON DELETE SET NULL;


--
-- Name: ai_content_generations ai_content_generations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_content_generations
    ADD CONSTRAINT ai_content_generations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: auto_dialer_queues auto_dialer_queues_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auto_dialer_queues
    ADD CONSTRAINT auto_dialer_queues_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: auto_dialer_queues auto_dialer_queues_vm_asset_id_voicemail_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auto_dialer_queues
    ADD CONSTRAINT auto_dialer_queues_vm_asset_id_voicemail_assets_id_fk FOREIGN KEY (vm_asset_id) REFERENCES public.voicemail_assets(id);


--
-- Name: bulk_imports bulk_imports_uploaded_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bulk_imports
    ADD CONSTRAINT bulk_imports_uploaded_by_id_users_id_fk FOREIGN KEY (uploaded_by_id) REFERENCES public.users(id);


--
-- Name: call_attempts call_attempts_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- Name: call_attempts call_attempts_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: call_attempts call_attempts_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: call_attempts call_attempts_vm_asset_id_voicemail_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_vm_asset_id_voicemail_assets_id_fk FOREIGN KEY (vm_asset_id) REFERENCES public.voicemail_assets(id);


--
-- Name: call_dispositions call_dispositions_call_session_id_call_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_dispositions
    ADD CONSTRAINT call_dispositions_call_session_id_call_sessions_id_fk FOREIGN KEY (call_session_id) REFERENCES public.call_sessions(id) ON DELETE CASCADE;


--
-- Name: call_dispositions call_dispositions_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_dispositions
    ADD CONSTRAINT call_dispositions_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: call_dispositions call_dispositions_disposition_id_dispositions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_dispositions
    ADD CONSTRAINT call_dispositions_disposition_id_dispositions_id_fk FOREIGN KEY (disposition_id) REFERENCES public.dispositions(id) ON DELETE RESTRICT;


--
-- Name: call_events call_events_attempt_id_call_attempts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_events
    ADD CONSTRAINT call_events_attempt_id_call_attempts_id_fk FOREIGN KEY (attempt_id) REFERENCES public.call_attempts(id) ON DELETE CASCADE;


--
-- Name: call_jobs call_jobs_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_jobs
    ADD CONSTRAINT call_jobs_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: call_jobs call_jobs_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_jobs
    ADD CONSTRAINT call_jobs_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: call_jobs call_jobs_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_jobs
    ADD CONSTRAINT call_jobs_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: call_jobs call_jobs_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_jobs
    ADD CONSTRAINT call_jobs_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: call_jobs call_jobs_locked_by_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_jobs
    ADD CONSTRAINT call_jobs_locked_by_agent_id_users_id_fk FOREIGN KEY (locked_by_agent_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: call_recording_access_logs call_recording_access_logs_call_attempt_id_call_attempts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_recording_access_logs
    ADD CONSTRAINT call_recording_access_logs_call_attempt_id_call_attempts_id_fk FOREIGN KEY (call_attempt_id) REFERENCES public.call_attempts(id) ON DELETE CASCADE;


--
-- Name: call_recording_access_logs call_recording_access_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_recording_access_logs
    ADD CONSTRAINT call_recording_access_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: call_scripts call_scripts_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_scripts
    ADD CONSTRAINT call_scripts_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: call_sessions call_sessions_call_job_id_call_jobs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_sessions
    ADD CONSTRAINT call_sessions_call_job_id_call_jobs_id_fk FOREIGN KEY (call_job_id) REFERENCES public.call_jobs(id) ON DELETE CASCADE;


--
-- Name: calls calls_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- Name: calls calls_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: calls calls_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: campaign_account_stats campaign_account_stats_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_account_stats
    ADD CONSTRAINT campaign_account_stats_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: campaign_account_stats campaign_account_stats_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_account_stats
    ADD CONSTRAINT campaign_account_stats_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_agent_assignments campaign_agent_assignments_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_agent_assignments
    ADD CONSTRAINT campaign_agent_assignments_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: campaign_agent_assignments campaign_agent_assignments_assigned_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_agent_assignments
    ADD CONSTRAINT campaign_agent_assignments_assigned_by_users_id_fk FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: campaign_agent_assignments campaign_agent_assignments_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_agent_assignments
    ADD CONSTRAINT campaign_agent_assignments_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_agents campaign_agents_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_agents
    ADD CONSTRAINT campaign_agents_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: campaign_agents campaign_agents_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_agents
    ADD CONSTRAINT campaign_agents_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_audience_snapshots campaign_audience_snapshots_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_audience_snapshots
    ADD CONSTRAINT campaign_audience_snapshots_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_content_links campaign_content_links_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_content_links
    ADD CONSTRAINT campaign_content_links_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_opt_outs campaign_opt_outs_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_opt_outs
    ADD CONSTRAINT campaign_opt_outs_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_opt_outs campaign_opt_outs_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_opt_outs
    ADD CONSTRAINT campaign_opt_outs_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: campaign_opt_outs campaign_opt_outs_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_opt_outs
    ADD CONSTRAINT campaign_opt_outs_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: campaign_orders campaign_orders_client_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_orders
    ADD CONSTRAINT campaign_orders_client_user_id_users_id_fk FOREIGN KEY (client_user_id) REFERENCES public.users(id);


--
-- Name: campaign_queue campaign_queue_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_queue
    ADD CONSTRAINT campaign_queue_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: campaign_queue campaign_queue_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_queue
    ADD CONSTRAINT campaign_queue_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- Name: campaign_queue campaign_queue_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_queue
    ADD CONSTRAINT campaign_queue_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_queue campaign_queue_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_queue
    ADD CONSTRAINT campaign_queue_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: campaign_suppression_accounts campaign_suppression_accounts_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_suppression_accounts
    ADD CONSTRAINT campaign_suppression_accounts_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: campaign_suppression_accounts campaign_suppression_accounts_added_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_suppression_accounts
    ADD CONSTRAINT campaign_suppression_accounts_added_by_users_id_fk FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: campaign_suppression_accounts campaign_suppression_accounts_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_suppression_accounts
    ADD CONSTRAINT campaign_suppression_accounts_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_suppression_contacts campaign_suppression_contacts_added_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_suppression_contacts
    ADD CONSTRAINT campaign_suppression_contacts_added_by_users_id_fk FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: campaign_suppression_contacts campaign_suppression_contacts_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_suppression_contacts
    ADD CONSTRAINT campaign_suppression_contacts_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_suppression_contacts campaign_suppression_contacts_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_suppression_contacts
    ADD CONSTRAINT campaign_suppression_contacts_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: city_reference city_reference_country_id_country_reference_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.city_reference
    ADD CONSTRAINT city_reference_country_id_country_reference_id_fk FOREIGN KEY (country_id) REFERENCES public.country_reference(id) ON DELETE CASCADE;


--
-- Name: city_reference city_reference_state_id_state_reference_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.city_reference
    ADD CONSTRAINT city_reference_state_id_state_reference_id_fk FOREIGN KEY (state_id) REFERENCES public.state_reference(id) ON DELETE CASCADE;


--
-- Name: company_aliases company_aliases_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.company_aliases
    ADD CONSTRAINT company_aliases_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contact_emails contact_emails_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_emails
    ADD CONSTRAINT contact_emails_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: contact_voicemail_tracking contact_voicemail_tracking_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_voicemail_tracking
    ADD CONSTRAINT contact_voicemail_tracking_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: contact_voicemail_tracking contact_voicemail_tracking_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_voicemail_tracking
    ADD CONSTRAINT contact_voicemail_tracking_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: contact_voicemail_tracking contact_voicemail_tracking_last_vm_asset_id_voicemail_assets_id; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_voicemail_tracking
    ADD CONSTRAINT contact_voicemail_tracking_last_vm_asset_id_voicemail_assets_id FOREIGN KEY (last_vm_asset_id) REFERENCES public.voicemail_assets(id);


--
-- Name: contacts contacts_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_invalidated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_invalidated_by_users_id_fk FOREIGN KEY (invalidated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: content_approvals content_approvals_asset_id_content_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_approvals
    ADD CONSTRAINT content_approvals_asset_id_content_assets_id_fk FOREIGN KEY (asset_id) REFERENCES public.content_assets(id) ON DELETE CASCADE;


--
-- Name: content_approvals content_approvals_reviewer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_approvals
    ADD CONSTRAINT content_approvals_reviewer_id_users_id_fk FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: content_asset_pushes content_asset_pushes_asset_id_content_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_asset_pushes
    ADD CONSTRAINT content_asset_pushes_asset_id_content_assets_id_fk FOREIGN KEY (asset_id) REFERENCES public.content_assets(id) ON DELETE CASCADE;


--
-- Name: content_asset_pushes content_asset_pushes_pushed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_asset_pushes
    ADD CONSTRAINT content_asset_pushes_pushed_by_users_id_fk FOREIGN KEY (pushed_by) REFERENCES public.users(id);


--
-- Name: content_assets content_assets_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_assets
    ADD CONSTRAINT content_assets_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: content_versions content_versions_asset_id_content_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_versions
    ADD CONSTRAINT content_versions_asset_id_content_assets_id_fk FOREIGN KEY (asset_id) REFERENCES public.content_assets(id) ON DELETE CASCADE;


--
-- Name: content_versions content_versions_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.content_versions
    ADD CONSTRAINT content_versions_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: custom_field_definitions custom_field_definitions_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: dedupe_review_queue dedupe_review_queue_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dedupe_review_queue
    ADD CONSTRAINT dedupe_review_queue_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: dispositions dispositions_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dispositions
    ADD CONSTRAINT dispositions_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: dkim_keys dkim_keys_domain_auth_id_domain_auth_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dkim_keys
    ADD CONSTRAINT dkim_keys_domain_auth_id_domain_auth_id_fk FOREIGN KEY (domain_auth_id) REFERENCES public.domain_auth(id) ON DELETE CASCADE;


--
-- Name: domain_set_contact_links domain_set_contact_links_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_set_contact_links
    ADD CONSTRAINT domain_set_contact_links_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: domain_set_contact_links domain_set_contact_links_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_set_contact_links
    ADD CONSTRAINT domain_set_contact_links_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: domain_set_contact_links domain_set_contact_links_domain_set_id_domain_sets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_set_contact_links
    ADD CONSTRAINT domain_set_contact_links_domain_set_id_domain_sets_id_fk FOREIGN KEY (domain_set_id) REFERENCES public.domain_sets(id) ON DELETE CASCADE;


--
-- Name: domain_set_items domain_set_items_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_set_items
    ADD CONSTRAINT domain_set_items_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: domain_set_items domain_set_items_domain_set_id_domain_sets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_set_items
    ADD CONSTRAINT domain_set_items_domain_set_id_domain_sets_id_fk FOREIGN KEY (domain_set_id) REFERENCES public.domain_sets(id) ON DELETE CASCADE;


--
-- Name: domain_sets domain_sets_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.domain_sets
    ADD CONSTRAINT domain_sets_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: dv_account_assignments dv_account_assignments_account_id_dv_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_account_assignments
    ADD CONSTRAINT dv_account_assignments_account_id_dv_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.dv_accounts(id) ON DELETE CASCADE;


--
-- Name: dv_accounts dv_accounts_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_accounts
    ADD CONSTRAINT dv_accounts_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_agent_filters dv_agent_filters_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_agent_filters
    ADD CONSTRAINT dv_agent_filters_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_company_caps dv_company_caps_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_company_caps
    ADD CONSTRAINT dv_company_caps_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_deliveries dv_deliveries_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_deliveries
    ADD CONSTRAINT dv_deliveries_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_field_constraints dv_field_constraints_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_field_constraints
    ADD CONSTRAINT dv_field_constraints_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_field_mappings dv_field_mappings_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_field_mappings
    ADD CONSTRAINT dv_field_mappings_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_project_agents dv_project_agents_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_project_agents
    ADD CONSTRAINT dv_project_agents_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_project_exclusions dv_project_exclusions_list_id_dv_exclusion_lists_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_project_exclusions
    ADD CONSTRAINT dv_project_exclusions_list_id_dv_exclusion_lists_id_fk FOREIGN KEY (list_id) REFERENCES public.dv_exclusion_lists(id) ON DELETE CASCADE;


--
-- Name: dv_project_exclusions dv_project_exclusions_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_project_exclusions
    ADD CONSTRAINT dv_project_exclusions_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_records dv_records_account_id_dv_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_records
    ADD CONSTRAINT dv_records_account_id_dv_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.dv_accounts(id);


--
-- Name: dv_records dv_records_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_records
    ADD CONSTRAINT dv_records_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_records_raw dv_records_raw_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_records_raw
    ADD CONSTRAINT dv_records_raw_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_runs dv_runs_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_runs
    ADD CONSTRAINT dv_runs_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: dv_runs dv_runs_record_id_dv_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_runs
    ADD CONSTRAINT dv_runs_record_id_dv_records_id_fk FOREIGN KEY (record_id) REFERENCES public.dv_records(id) ON DELETE CASCADE;


--
-- Name: dv_selection_sets dv_selection_sets_project_id_dv_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dv_selection_sets
    ADD CONSTRAINT dv_selection_sets_project_id_dv_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.dv_projects(id) ON DELETE CASCADE;


--
-- Name: email_events email_events_send_id_email_sends_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_send_id_email_sends_id_fk FOREIGN KEY (send_id) REFERENCES public.email_sends(id) ON DELETE CASCADE;


--
-- Name: email_messages email_messages_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: email_messages email_messages_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: email_sends email_sends_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_sends
    ADD CONSTRAINT email_sends_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: email_sends email_sends_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_sends
    ADD CONSTRAINT email_sends_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: email_sends email_sends_sender_profile_id_sender_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_sends
    ADD CONSTRAINT email_sends_sender_profile_id_sender_profiles_id_fk FOREIGN KEY (sender_profile_id) REFERENCES public.sender_profiles(id);


--
-- Name: email_sends email_sends_template_id_email_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_sends
    ADD CONSTRAINT email_sends_template_id_email_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.email_templates(id);


--
-- Name: email_templates email_templates_approved_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_approved_by_id_users_id_fk FOREIGN KEY (approved_by_id) REFERENCES public.users(id);


--
-- Name: events events_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: field_change_log field_change_log_actor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.field_change_log
    ADD CONSTRAINT field_change_log_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: global_dnc global_dnc_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.global_dnc
    ADD CONSTRAINT global_dnc_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: global_dnc global_dnc_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.global_dnc
    ADD CONSTRAINT global_dnc_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: industry_reference industry_reference_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.industry_reference
    ADD CONSTRAINT industry_reference_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.industry_reference(id) ON DELETE SET NULL;


--
-- Name: leads leads_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- Name: leads leads_approved_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_approved_by_id_users_id_fk FOREIGN KEY (approved_by_id) REFERENCES public.users(id);


--
-- Name: leads leads_call_attempt_id_call_attempts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_call_attempt_id_call_attempts_id_fk FOREIGN KEY (call_attempt_id) REFERENCES public.call_attempts(id) ON DELETE SET NULL;


--
-- Name: leads leads_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: leads leads_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: lists lists_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: news news_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_assets order_assets_order_id_campaign_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_assets
    ADD CONSTRAINT order_assets_order_id_campaign_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.campaign_orders(id) ON DELETE CASCADE;


--
-- Name: order_audience_snapshots order_audience_snapshots_order_id_campaign_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_audience_snapshots
    ADD CONSTRAINT order_audience_snapshots_order_id_campaign_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.campaign_orders(id) ON DELETE CASCADE;


--
-- Name: order_campaign_links order_campaign_links_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_campaign_links
    ADD CONSTRAINT order_campaign_links_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: order_campaign_links order_campaign_links_linked_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_campaign_links
    ADD CONSTRAINT order_campaign_links_linked_by_id_users_id_fk FOREIGN KEY (linked_by_id) REFERENCES public.users(id);


--
-- Name: order_campaign_links order_campaign_links_order_id_campaign_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_campaign_links
    ADD CONSTRAINT order_campaign_links_order_id_campaign_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.campaign_orders(id) ON DELETE CASCADE;


--
-- Name: order_qualification_questions order_qualification_questions_order_id_campaign_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_qualification_questions
    ADD CONSTRAINT order_qualification_questions_order_id_campaign_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.campaign_orders(id) ON DELETE CASCADE;


--
-- Name: qualification_responses qualification_responses_attempt_id_call_attempts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.qualification_responses
    ADD CONSTRAINT qualification_responses_attempt_id_call_attempts_id_fk FOREIGN KEY (attempt_id) REFERENCES public.call_attempts(id) ON DELETE CASCADE;


--
-- Name: qualification_responses qualification_responses_lead_id_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.qualification_responses
    ADD CONSTRAINT qualification_responses_lead_id_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: resources resources_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: saved_filters saved_filters_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saved_filters
    ADD CONSTRAINT saved_filters_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: segments segments_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.segments
    ADD CONSTRAINT segments_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: selection_contexts selection_contexts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.selection_contexts
    ADD CONSTRAINT selection_contexts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sip_trunk_configs sip_trunk_configs_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sip_trunk_configs
    ADD CONSTRAINT sip_trunk_configs_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: social_posts social_posts_asset_id_content_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_asset_id_content_assets_id_fk FOREIGN KEY (asset_id) REFERENCES public.content_assets(id) ON DELETE SET NULL;


--
-- Name: social_posts social_posts_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: softphone_profiles softphone_profiles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.softphone_profiles
    ADD CONSTRAINT softphone_profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: state_reference state_reference_country_id_country_reference_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.state_reference
    ADD CONSTRAINT state_reference_country_id_country_reference_id_fk FOREIGN KEY (country_id) REFERENCES public.country_reference(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_users_id_fk FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: verification_audit_log verification_audit_log_actor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_audit_log
    ADD CONSTRAINT verification_audit_log_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: verification_campaigns verification_campaigns_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_campaigns
    ADD CONSTRAINT verification_campaigns_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: verification_contacts verification_contacts_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_contacts
    ADD CONSTRAINT verification_contacts_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: verification_contacts verification_contacts_assignee_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_contacts
    ADD CONSTRAINT verification_contacts_assignee_id_users_id_fk FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: verification_contacts verification_contacts_campaign_id_verification_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_contacts
    ADD CONSTRAINT verification_contacts_campaign_id_verification_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.verification_campaigns(id) ON DELETE CASCADE;


--
-- Name: verification_email_validation_jobs verification_email_validation_jobs_campaign_id_verification_cam; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_email_validation_jobs
    ADD CONSTRAINT verification_email_validation_jobs_campaign_id_verification_cam FOREIGN KEY (campaign_id) REFERENCES public.verification_campaigns(id) ON DELETE CASCADE;


--
-- Name: verification_email_validation_jobs verification_email_validation_jobs_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_email_validation_jobs
    ADD CONSTRAINT verification_email_validation_jobs_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: verification_email_validations verification_email_validations_contact_id_verification_contacts; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_email_validations
    ADD CONSTRAINT verification_email_validations_contact_id_verification_contacts FOREIGN KEY (contact_id) REFERENCES public.verification_contacts(id) ON DELETE CASCADE;


--
-- Name: verification_lead_submissions verification_lead_submissions_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_lead_submissions
    ADD CONSTRAINT verification_lead_submissions_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: verification_lead_submissions verification_lead_submissions_campaign_id_verification_campaign; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_lead_submissions
    ADD CONSTRAINT verification_lead_submissions_campaign_id_verification_campaign FOREIGN KEY (campaign_id) REFERENCES public.verification_campaigns(id) ON DELETE CASCADE;


--
-- Name: verification_lead_submissions verification_lead_submissions_contact_id_verification_contacts_; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_lead_submissions
    ADD CONSTRAINT verification_lead_submissions_contact_id_verification_contacts_ FOREIGN KEY (contact_id) REFERENCES public.verification_contacts(id) ON DELETE CASCADE;


--
-- Name: verification_suppression_list verification_suppression_list_campaign_id_verification_campaign; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_suppression_list
    ADD CONSTRAINT verification_suppression_list_campaign_id_verification_campaign FOREIGN KEY (campaign_id) REFERENCES public.verification_campaigns(id) ON DELETE CASCADE;


--
-- Name: verification_upload_jobs verification_upload_jobs_campaign_id_verification_campaigns_id_; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_upload_jobs
    ADD CONSTRAINT verification_upload_jobs_campaign_id_verification_campaigns_id_ FOREIGN KEY (campaign_id) REFERENCES public.verification_campaigns(id) ON DELETE CASCADE;


--
-- Name: verification_upload_jobs verification_upload_jobs_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_upload_jobs
    ADD CONSTRAINT verification_upload_jobs_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: voicemail_assets voicemail_assets_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.voicemail_assets
    ADD CONSTRAINT voicemail_assets_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: warmup_plans warmup_plans_ip_pool_id_ip_pools_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.warmup_plans
    ADD CONSTRAINT warmup_plans_ip_pool_id_ip_pools_id_fk FOREIGN KEY (ip_pool_id) REFERENCES public.ip_pools(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

