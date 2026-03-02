# SUPABASE_SCHEMA.md
## Lynx Platform — Complete Database Schema Reference

**Auto-generated from Supabase public schema export.**
**Keep this file in the repo root. Reference it before writing ANY Supabase query.**

**110 tables · 1675 columns**

**Both the web admin (`volleybrain-admin`) and mobile app (`volleybrain-mobile3`) share this database.**
**NEVER run DROP TABLE, DROP COLUMN, or destructive ALTER statements.**
**Always use IF NOT EXISTS when creating tables or columns.**

---

## Table of Contents

- **Core / Organization**: organizations, seasons, sports, sport_positions, age_groups, venues, league_settings
- **Users & Profiles**: profiles, user_roles, role_assignments, user_active_contexts, families, user_blocks
- **Teams & Coaching**: teams, team_coaches, team_staff, coaches, coach_sports, team_invite_codes, team_documents, team_milestones
- **Players**: players, player_guardians, player_parents, player_positions, team_players, player_coach_notes, player_evaluations, player_skill_ratings, player_skills, sport_skill_templates, player_goals, player_highlights
- **Registration & Payments**: registrations, registration_templates, season_fees, payments, payment_sessions, payment_settings, stripe_customers, stripe_payment_intents, stripe_webhook_logs, external_leagues, external_league_registrations, external_league_status_view
- **Schedule & Events**: schedule_events, event_rsvps, event_attendance, event_volunteers, volunteer_blasts
- **Games & Stats**: games, game_results, game_lineups, lineup_positions, lineup_substitutions, game_day_templates, player_game_stats, player_stats, player_season_stats, team_standings, games_needing_stats
- **Engagement & Achievements**: achievements, player_achievements, player_achievement_progress, player_tracked_achievements, user_achievements, player_badges, shoutouts, shoutout_categories, coach_challenges, challenge_participants, xp_ledger
- **Team Wall / Social**: team_posts, team_post_comments, team_post_reactions, post_reactions
- **Chat / Messaging**: chat_channels, channel_members, chat_messages, typing_indicators, messages, message_recipients, message_attachments, message_reactions, message_reports
- **Notifications**: notifications, notification_preferences, notification_templates, admin_notifications, email_notifications, email_logs, push_tokens, announcements, announcement_reads
- **Waivers**: waivers, waiver_templates, waiver_signatures, waiver_sends, waiver_edit_history
- **Jerseys**: jersey_assignments, jersey_assignment_history, v_jersey_alerts, v_jersey_status
- **Invitations & Accounts**: invitations, account_invites
- **Platform Admin**: platform_subscriptions, platform_invoices, platform_admin_actions
- **Views**: v_season_standings, v_jersey_alerts, v_jersey_status, external_league_status_view, games_needing_stats
- **Other**: game_player_stats

---

## Core / Organization

### organizations

| Column | Type |
|--------|------|
| id | uuid |
| name | text |
| slug | text |
| logo_url | text |
| primary_color | text |
| secondary_color | text |
| contact_email | text |
| contact_phone | text |
| website | text |
| created_at | timestamptz |
| updated_at | timestamptz |
| allow_self_registration | bool |
| registration_open | bool |
| settings | jsonb |
| type | USER-DEFINED |
| parent_org_id | uuid |
| description | text |
| address_line1 | text |
| address_line2 | text |
| city | text |
| state | text |
| zip | text |
| stripe_account_id | text |
| stripe_onboarding_complete | bool |
| is_active | bool |
| stripe_enabled | bool |
| stripe_publishable_key | text |
| stripe_webhook_secret | text |
| stripe_mode | text |
| stripe_webhook_configured | bool |
| payment_processing_fee_mode | text |
| allow_partial_payments | bool |
| minimum_payment_amount | int |
| send_receipt_emails | bool |
| payment_venmo | text |
| payment_zelle | text |
| payment_cashapp | text |
| payment_instructions | text |
| banner_url | text |

### seasons

| Column | Type |
|--------|------|
| id | uuid |
| name | text |
| status | text |
| registration_close | date |
| start_date | date |
| end_date | date |
| fee_registration | numeric |
| fee_uniform | numeric |
| fee_monthly | numeric |
| months_in_season | int |
| created_at | timestamptz |
| updated_at | timestamptz |
| registration_open | bool |
| registration_closes_at | date |
| organization_id | uuid |
| sport_id | uuid |
| min_players_per_team | int |
| max_players_per_team | int |
| monthly_fee_count | int |
| registration_opens | date |
| registration_closes | date |
| early_bird_deadline | date |
| early_bird_discount | numeric |
| late_registration_deadline | date |
| late_registration_fee | numeric |
| capacity | int |
| waitlist_enabled | bool |
| waitlist_capacity | int |
| description | text |
| fee_per_family | numeric |
| sibling_discount_type | text |
| sibling_discount_amount | numeric |
| sibling_discount_apply_to | text |
| sport | text |
| registration_config | jsonb |
| registration_template_id | uuid |

### sports

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| name | text |
| code | text |
| icon | text |
| color_primary | text |
| color_secondary | text |
| color_accent | text |
| is_active | bool |
| sort_order | int |
| created_at | timestamptz |
| updated_at | timestamptz |

### sport_positions

| Column | Type |
|--------|------|
| id | uuid |
| sport_id | uuid |
| position_code | varchar |
| position_name | varchar |
| position_short | varchar |
| is_starter_position | bool |
| position_order | int |
| color | varchar |
| description | text |
| created_at | timestamptz |

### age_groups

| Column | Type |
|--------|------|
| id | uuid |
| season_id | uuid |
| name | text |
| min_grade | int |
| max_grade | int |
| display_order | int |
| created_at | timestamptz |

### venues

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| name | text |
| short_name | text |
| address | text |
| city | text |
| state | text |
| zip | text |
| google_maps_url | text |
| contact_name | text |
| contact_phone | text |
| contact_email | text |
| courts_available | int |
| court_names | array |
| is_home | bool |
| parking_instructions | text |
| entrance_instructions | text |
| notes | text |
| photo_url | text |
| rental_cost_per_hour | numeric |
| created_at | timestamptz |
| updated_at | timestamptz |

### league_settings

| Column | Type |
|--------|------|
| id | uuid |
| name | text |
| location | text |
| logo | text |
| venmo_handle | text |
| zelle_handle | text |
| cashapp_handle | text |
| created_at | timestamptz |
| updated_at | timestamptz |

## Users & Profiles

### profiles

| Column | Type |
|--------|------|
| id | uuid |
| email | text |
| full_name | text |
| phone | text |
| role | text |
| avatar_url | text |
| created_at | timestamptz |
| updated_at | timestamptz |
| account_type | text |
| parent_profile_id | uuid |
| coppa_consent_given | bool |
| coppa_consent_date | timestamptz |
| primary_role | text |
| current_organization_id | uuid |
| onboarding_complete | bool |
| pending_approval | bool |
| onboarding_completed | bool |
| onboarding_data | jsonb |
| parent_tutorial_data | jsonb |
| is_platform_admin | bool |
| is_suspended | bool |
| deletion_requested | bool |
| total_xp | int |
| player_level | int |

### user_roles

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| user_id | uuid |
| role | text |
| granted_by | uuid |
| granted_at | timestamptz |
| revoked_at | timestamptz |
| revoked_by | uuid |
| is_active | bool |

### role_assignments

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid |
| role | text |
| scope_type | text |
| scope_id | uuid |
| granted_by | uuid |
| granted_at | timestamptz |
| expires_at | timestamptz |
| is_active | bool |

### user_active_contexts

| Column | Type |
|--------|------|
| user_id | uuid |
| active_organization_id | uuid |
| active_team_id | uuid |
| active_role | text |
| recent_contexts | jsonb |
| updated_at | timestamptz |

### families

| Column | Type |
|--------|------|
| id | uuid |
| name | text |
| primary_email | text |
| primary_phone | text |
| notes | text |
| created_at | timestamptz |
| updated_at | timestamptz |
| address | text |
| emergency_contact_name | text |
| emergency_contact_phone | text |
| emergency_contact_relation | text |
| primary_contact_name | text |
| primary_contact_phone | text |
| primary_contact_email | text |
| secondary_contact_name | text |
| secondary_contact_phone | text |
| secondary_contact_email | text |
| account_id | uuid |

### user_blocks

| Column | Type |
|--------|------|
| id | uuid |
| blocker_id | uuid |
| blocked_id | uuid |
| created_at | timestamptz |

## Teams & Coaching

### teams

| Column | Type |
|--------|------|
| id | uuid |
| season_id | uuid |
| age_group_id | uuid |
| name | text |
| team_type | text |
| color | text |
| max_players | int |
| coach_id | uuid |
| created_at | timestamptz |
| updated_at | timestamptz |
| logo_url | text |
| motto | text |
| banner_url | text |
| abbreviation | varchar |
| age_group | varchar |
| age_group_type | varchar |
| skill_level | varchar |
| gender | varchar |
| max_roster_size | int |
| min_roster_size | int |
| roster_open | bool |
| description | text |
| internal_notes | text |
| is_independent | bool |
| cover_image_url | text |

### team_coaches

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| coach_id | uuid |
| role | text |
| created_at | timestamptz |

### team_staff

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| user_id | uuid |
| staff_role | text |
| assigned_by | uuid |
| assigned_at | timestamptz |
| removed_at | timestamptz |
| is_active | bool |

### coaches

| Column | Type |
|--------|------|
| id | uuid |
| season_id | uuid |
| first_name | text |
| last_name | text |
| email | text |
| phone | text |
| address | text |
| experience_years | int |
| experience_details | text |
| specialties | text |
| emergency_contact_name | text |
| emergency_contact_phone | text |
| emergency_contact_relation | text |
| status | text |
| notes | text |
| created_at | timestamptz |
| updated_at | timestamptz |
| profile_id | uuid |
| photo_url | text |
| bio | text |
| date_of_birth | date |
| gender | text |
| shirt_size | text |
| certifications | jsonb |
| background_check_status | text |
| background_check_date | date |
| background_check_expiry | date |
| coaching_license | text |
| coaching_level | text |
| preferred_sports | jsonb |
| preferred_age_groups | jsonb |
| availability | text |
| waiver_signed | bool |
| waiver_signed_at | timestamptz |
| waiver_signer_name | text |
| code_of_conduct_signed | bool |
| code_of_conduct_signed_at | timestamptz |
| secondary_phone | text |
| preferred_contact | text |

### coach_sports

| Column | Type |
|--------|------|
| id | uuid |
| coach_id | uuid |
| sport_id | uuid |
| is_active | bool |
| created_at | timestamptz |

### team_invite_codes

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| code | text |
| max_uses | int |
| current_uses | int |
| created_by | uuid |
| created_at | timestamptz |
| expires_at | timestamptz |
| is_active | bool |

### team_documents

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| uploaded_by | uuid |
| name | text |
| description | text |
| file_url | text |
| file_type | text |
| file_size | int |
| category | text |
| is_archived | bool |
| created_at | timestamptz |
| updated_at | timestamptz |

### team_milestones

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| created_by | uuid |
| milestone_type | text |
| title | text |
| description | text |
| opponent_name | text |
| score_us | int |
| score_them | int |
| player_id | uuid |
| icon | text |
| highlight_color | text |
| milestone_date | date |
| created_at | timestamptz |

## Players

### players

| Column | Type |
|--------|------|
| id | uuid |
| season_id | uuid |
| first_name | text |
| last_name | text |
| birth_date | date |
| grade | int |
| position | text |
| experience | text |
| parent_id | uuid |
| parent_name | text |
| parent_email | text |
| parent_phone | text |
| address | text |
| emergency_name | text |
| emergency_phone | text |
| emergency_relation | text |
| status | text |
| eval_score | int |
| returning_player | bool |
| registration_date | timestamptz |
| jersey_number | int |
| jersey_size | text |
| medical_notes | text |
| waiver_signed | bool |
| photo_release | bool |
| created_at | timestamptz |
| updated_at | timestamptz |
| dob | date |
| school | text |
| player_type | text |
| jersey_pref_1 | int |
| jersey_pref_2 | int |
| jersey_pref_3 | int |
| experience_level | text |
| experience_details | text |
| goals | text |
| uniform_size_jersey | text |
| uniform_size_shorts | text |
| parent_2_name | text |
| parent_2_phone | text |
| parent_2_email | text |
| emergency_contact_name | text |
| emergency_contact_phone | text |
| emergency_contact_relation | text |
| medical_conditions | text |
| allergies | text |
| medications | text |
| waiver_liability | bool |
| waiver_photo | bool |
| waiver_conduct | bool |
| waiver_signed_by | text |
| waiver_signed_date | timestamp |
| registration_source | text |
| notes | text |
| photo_url | text |
| family_id | uuid |
| skill_rating | int |
| evaluation_notes | text |
| birth_certificate_url | text |
| medical_form_url | text |
| player_pin | text |
| player_account_enabled | bool |
| parent_account_id | uuid |
| preferred_team_id | uuid |
| preferred_coach_id | uuid |
| team_preference_notes | text |
| sport_id | uuid |
| placement_preferences | text |
| gender | text |
| prefilled_from_player_id | uuid |
| equipped_calling_card_id | uuid |
| show_achievements_publicly | bool |
| uniform_sizes_extra | jsonb |
| city | text |
| state | text |
| zip | text |
| parent2_name | text |
| parent2_email | text |
| parent2_phone | text |

### player_guardians

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| guardian_id | uuid |
| relationship | text |
| is_primary | bool |
| can_pickup | bool |
| created_at | timestamptz |

### player_parents

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| parent_id | uuid |
| relationship | text |
| is_primary | bool |
| can_pickup | bool |
| receives_notifications | bool |
| created_at | timestamptz |

### player_positions

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| sport_id | uuid |
| primary_position | varchar |
| secondary_position | varchar |
| tertiary_position | varchar |
| is_captain | bool |
| is_co_captain | bool |
| can_play_libero | bool |
| skill_rating | int |
| serve_rating | int |
| attack_rating | int |
| defense_rating | int |
| setting_rating | int |
| notes | text |
| created_at | timestamptz |
| updated_at | timestamptz |

### team_players

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| player_id | uuid |
| jersey_number | int |
| is_primary_team | bool |
| joined_at | timestamptz |
| jersey_assigned_at | timestamptz |
| jersey_needs_order | bool |
| jersey_ordered_at | timestamptz |
| jersey_preference_result | text |

### player_coach_notes

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| coach_id | uuid |
| season_id | uuid |
| note_type | text |
| content | text |
| is_private | bool |
| created_at | timestamptz |
| updated_at | timestamptz |

### player_evaluations

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| season_id | uuid |
| evaluated_by | uuid |
| evaluation_type | text |
| evaluation_date | date |
| overall_score | int |
| skills | jsonb |
| notes | text |
| is_initial | bool |
| created_at | timestamptz |
| updated_at | timestamptz |

### player_skill_ratings

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| team_id | uuid |
| season_id | uuid |
| overall_rating | int |
| serving_rating | int |
| passing_rating | int |
| setting_rating | int |
| attacking_rating | int |
| blocking_rating | int |
| defense_rating | int |
| hustle_rating | int |
| coachability_rating | int |
| teamwork_rating | int |
| coach_notes | text |
| rated_by | uuid |
| rated_at | timestamptz |
| created_at | timestamptz |
| updated_at | timestamptz |

### player_skills

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| passing | int |
| serving | int |
| hitting | int |
| blocking | int |
| setting | int |
| defense | int |
| created_at | timestamp |
| updated_at | timestamp |
| sport | text |
| skills_data | jsonb |
| season_id | uuid |

### sport_skill_templates

| Column | Type |
|--------|------|
| id | uuid |
| sport_name | text |
| skill_key | text |
| skill_name | text |
| skill_description | text |
| display_order | int |
| is_active | bool |
| created_at | timestamptz |

### player_goals

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| season_id | uuid |
| created_by | uuid |
| title | text |
| description | text |
| category | text |
| target_value | int |
| current_value | int |
| target_date | date |
| status | text |
| progress_notes | text |
| completed_at | timestamptz |
| created_at | timestamptz |
| updated_at | timestamptz |

### player_highlights

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| title | text |
| video_url | text |
| thumbnail_url | text |
| description | text |
| event_date | date |
| created_at | timestamp |

## Registration & Payments

### registrations

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| season_id | uuid |
| family_id | uuid |
| status | text |
| submitted_at | timestamptz |
| reviewed_at | timestamptz |
| reviewed_by | uuid |
| approved_at | timestamptz |
| paid_at | timestamptz |
| rostered_at | timestamptz |
| withdrawn_at | timestamptz |
| needs_evaluation | bool |
| evaluated_at | timestamptz |
| evaluated_by | uuid |
| evaluation_notes | text |
| waitlist_position | int |
| waitlist_notes | text |
| denial_reason | text |
| registration_source | text |
| admin_notes | text |
| created_at | timestamptz |
| updated_at | timestamptz |
| custom_answers | jsonb |
| registration_data | jsonb |
| waivers_accepted | jsonb |
| signature_name | text |
| signature_date | timestamptz |
| signature_ip | text |

### registration_templates

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| name | text |
| description | text |
| sport_id | uuid |
| is_default | bool |
| is_active | bool |
| player_fields | jsonb |
| parent_fields | jsonb |
| emergency_fields | jsonb |
| medical_fields | jsonb |
| waivers | jsonb |
| custom_questions | jsonb |
| created_at | timestamptz |
| updated_at | timestamptz |

### season_fees

| Column | Type |
|--------|------|
| id | uuid |
| season_id | uuid |
| fee_type | text |
| fee_name | text |
| amount | numeric |
| due_date | date |
| required | bool |
| sort_order | int |
| created_at | timestamptz |

### payments

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| season_id | uuid |
| fee_type | text |
| amount | numeric |
| paid | bool |
| paid_date | date |
| payment_method | text |
| notes | text |
| created_at | timestamptz |
| updated_at | timestamptz |
| fee_name | text |
| payer_name | text |
| reported_at | timestamptz |
| verified_at | timestamptz |
| verified_by | uuid |
| status | text |
| reference_number | text |
| family_email | text |
| auto_generated | bool |
| fee_category | text |
| registration_id | uuid |
| description | text |
| due_date | date |
| stripe_payment_intent_id | text |
| stripe_checkout_session_id | text |
| receipt_url | text |
| paid_at | timestamptz |
| early_bird_applied | bool |
| early_bird_amount | numeric |
| sibling_discount_applied | bool |
| sibling_discount_amount | numeric |
| sibling_index | int |

### payment_sessions

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| user_id | uuid |
| family_email | text |
| payment_ids | array |
| stripe_session_id | text |
| amount_total | numeric |
| status | text |
| created_at | timestamptz |
| completed_at | timestamptz |
| metadata | jsonb |

### payment_settings

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| cashapp_handle | text |
| venmo_handle | text |
| zelle_email | text |
| zelle_phone | text |
| square_enabled | bool |
| square_location_id | text |
| instructions | text |
| created_at | timestamptz |
| updated_at | timestamptz |

### stripe_customers

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| email | text |
| stripe_customer_id | text |
| name | text |
| phone | text |
| created_at | timestamptz |
| updated_at | timestamptz |

### stripe_payment_intents

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| stripe_payment_intent_id | text |
| stripe_customer_id | text |
| amount | numeric |
| currency | text |
| status | text |
| payment_ids | array |
| parent_email | text |
| client_secret | text |
| error_message | text |
| paid_at | timestamptz |
| refunded_at | timestamptz |
| refund_amount | numeric |
| metadata | jsonb |
| created_at | timestamptz |
| updated_at | timestamptz |

### stripe_webhook_logs

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| event_id | text |
| event_type | text |
| payload | jsonb |
| processed | bool |
| error_message | text |
| created_at | timestamptz |

### external_leagues

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| name | text |
| facility_name | text |
| website | text |
| season_name | text |
| sport | text |
| season_start | date |
| season_end | date |
| registration_deadline | date |
| early_registration_deadline | date |
| coaches_meeting | date |
| forms_due | date |
| practices_begin | date |
| games_begin | date |
| team_registration_fee | numeric |
| individual_registration_fee | numeric |
| late_fee_team | numeric |
| late_fee_individual | numeric |
| notes | text |
| blackout_dates | jsonb |
| division_info | jsonb |
| settings | jsonb |
| created_at | timestamptz |
| updated_at | timestamptz |

### external_league_registrations

| Column | Type |
|--------|------|
| id | uuid |
| external_league_id | uuid |
| team_id | uuid |
| status | USER-DEFINED |
| fee_amount | numeric |
| amount_paid | numeric |
| payment_due_date | date |
| payment_date | date |
| payment_method | text |
| payment_reference | text |
| forms_submitted | bool |
| forms_submitted_date | date |
| required_documents | jsonb |
| schedule_received | bool |
| division | text |
| notes | text |
| created_at | timestamptz |
| updated_at | timestamptz |

### external_league_status_view

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| league_name | text |
| facility_name | text |
| registration_deadline | date |
| forms_due | date |
| team_registration_fee | numeric |
| season_start | date |
| season_end | date |
| teams_registered | bigint |
| total_fees | numeric |
| total_paid | numeric |
| outstanding | numeric |
| planned_count | bigint |
| registered_count | bigint |
| paid_count | bigint |
| confirmed_count | bigint |
| deadline_passed | bool |
| forms_overdue | bool |

## Schedule & Events

### schedule_events

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| event_type | text |
| title | text |
| event_date | date |
| event_time | time |
| duration_hours | numeric |
| location | text |
| opponent | text |
| notes | text |
| is_recurring | bool |
| recurring_day | text |
| created_at | timestamptz |
| updated_at | timestamptz |
| location_type | text |
| opponent_name | text |
| opponent_team_id | uuid |
| our_score | int |
| opponent_score | int |
| arrival_time | timestamp |
| venue_name | text |
| venue_address | text |
| end_time | time |
| season_id | uuid |
| duration_minutes | int |
| start_time | timestamptz |
| description | text |
| game_status | text |
| game_result | text |
| completed_at | timestamptz |
| completed_by | uuid |
| scoring_format | text |
| set_scores | jsonb |
| period_scores | jsonb |
| our_sets_won | int |
| opponent_sets_won | int |
| point_differential | int |
| stats_entered | bool |
| stats_entered_at | timestamptz |
| stats_entered_by | uuid |
| court_number | text |

### event_rsvps

| Column | Type |
|--------|------|
| id | uuid |
| event_id | uuid |
| player_id | uuid |
| responded_by | uuid |
| status | text |
| notes | text |
| responded_at | timestamptz |
| updated_at | timestamptz |

### event_attendance

| Column | Type |
|--------|------|
| id | uuid |
| event_id | uuid |
| player_id | uuid |
| status | text |
| notes | text |
| recorded_at | timestamptz |
| recorded_by | uuid |

### event_volunteers

| Column | Type |
|--------|------|
| id | uuid |
| event_id | uuid |
| profile_id | uuid |
| role | text |
| position | text |
| notes | text |
| signed_up_at | timestamptz |

### volunteer_blasts

| Column | Type |
|--------|------|
| id | uuid |
| event_id | uuid |
| role | text |
| sent_by | uuid |
| sent_at | timestamptz |
| sent_date | date |
| recipient_count | int |

## Games & Stats

### games

| Column | Type |
|--------|------|
| id | uuid |
| schedule_event_id | uuid |
| team_id | uuid |
| season_id | uuid |
| home_team_id | uuid |
| away_team_id | uuid |
| home_score | int |
| away_score | int |
| team_score | int |
| opponent_score | int |
| opponent_name | text |
| date | date |
| status | text |
| result | text |
| notes | text |
| completed_at | timestamptz |
| created_at | timestamptz |

### game_results

| Column | Type |
|--------|------|
| id | uuid |
| event_id | uuid |
| team_id | uuid |
| opponent_name | varchar |
| result | varchar |
| sets_won | int |
| sets_lost | int |
| set_scores | jsonb |
| total_points_us | int |
| total_points_them | int |
| mvp_player_id | uuid |
| notes | text |
| recorded_by | uuid |
| recorded_at | timestamptz |
| created_at | timestamptz |

### game_lineups

| Column | Type |
|--------|------|
| id | uuid |
| event_id | uuid |
| player_id | uuid |
| rotation_order | int |
| is_starter | bool |
| is_libero | bool |
| position | text |
| created_at | timestamptz |
| team_id | uuid |
| is_published | bool |
| rotation_type | text |

### lineup_positions

| Column | Type |
|--------|------|
| id | uuid |
| lineup_id | uuid |
| set_number | int |
| rotation_number | int |
| court_position | int |
| player_id | uuid |
| is_serving | bool |
| is_libero_in | bool |
| sub_for_player_id | uuid |
| created_at | timestamptz |

### lineup_substitutions

| Column | Type |
|--------|------|
| id | uuid |
| lineup_id | uuid |
| set_number | int |
| at_rotation | int |
| player_out_id | uuid |
| player_in_id | uuid |
| sub_type | varchar |
| notes | text |
| created_at | timestamptz |

### game_day_templates

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| season_id | uuid |
| name | text |
| subject | text |
| body | text |
| is_default | bool |
| created_by | uuid |
| created_at | timestamp |

### player_game_stats

| Column | Type |
|--------|------|
| id | uuid |
| game_result_id | uuid |
| player_id | uuid |
| kills | int |
| kill_errors | int |
| attack_attempts | int |
| aces | int |
| serve_errors | int |
| serve_attempts | int |
| digs | int |
| dig_errors | int |
| blocks | int |
| block_errors | int |
| assists | int |
| ball_handling_errors | int |
| hitting_percentage | numeric |
| points_scored | int |
| created_at | timestamptz |

### player_stats

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| kills | int |
| digs | int |
| assists | int |
| aces | int |
| blocks | int |
| serve_pct | numeric |
| attack_pct | numeric |
| games_played | int |
| created_at | timestamp |
| updated_at | timestamp |

### player_season_stats

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| team_id | uuid |
| season_id | uuid |
| games_played | int |
| games_started | int |
| total_serves | int |
| total_aces | int |
| total_service_errors | int |
| total_attacks | int |
| total_kills | int |
| total_attack_errors | int |
| total_blocks | int |
| total_block_assists | int |
| total_digs | int |
| total_assists | int |
| total_receptions | int |
| total_reception_errors | int |
| total_points | int |
| aces_per_game | numeric |
| kills_per_game | numeric |
| blocks_per_game | numeric |
| digs_per_game | numeric |
| assists_per_game | numeric |
| points_per_game | numeric |
| hitting_percentage | numeric |
| serve_percentage | numeric |
| total_basketball_points | int |
| total_rebounds | int |
| total_basketball_assists | int |
| total_steals | int |
| total_turnovers | int |
| total_goals | int |
| total_soccer_assists | int |
| total_shots | int |
| total_saves | int |
| created_at | timestamptz |
| updated_at | timestamptz |
| total_fg_made | int |
| total_fg_att | int |
| total_three_made | int |
| total_three_att | int |
| total_ft_made | int |
| total_ft_att | int |
| total_fouls | int |
| total_shots_on_target | int |
| total_shots_against | int |
| total_yellow_cards | int |
| total_red_cards | int |
| total_doubles | int |
| total_triples | int |
| total_home_runs | int |
| total_stolen_bases | int |
| total_at_bats | int |
| total_hits | int |
| total_runs | int |
| total_rbis | int |
| total_walks | int |
| total_strikeouts | int |
| total_pass_att | int |
| total_completions | int |
| total_passing_yards | int |
| total_passing_tds | int |
| total_interceptions | int |
| total_rush_att | int |
| total_rushing_yards | int |
| total_rushing_tds | int |
| total_receiving_yards | int |
| total_receiving_tds | int |
| total_tackles | int |
| total_sacks | int |
| total_plus_minus | int |
| total_penalty_minutes | int |
| total_power_play_goals | int |
| total_short_handed_goals | int |
| fg_percentage | numeric |
| three_percentage | numeric |
| ft_percentage | numeric |
| batting_avg | numeric |
| on_base_pct | numeric |
| completion_pct | numeric |
| shot_pct | numeric |
| save_pct | numeric |
| total_fgm | int |
| total_fga | int |
| total_3pm | int |
| total_3pa | int |
| total_ftm | int |
| total_fta | int |
| shot_accuracy | numeric |
| batting_average | numeric |
| on_base_percentage | numeric |
| slugging_percentage | numeric |
| total_pass_attempts | int |
| total_rush_attempts | int |
| total_targets | int |
| completion_percentage | numeric |
| yards_per_carry | numeric |
| catch_percentage | numeric |
| save_percentage | numeric |

### team_standings

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| season_id | uuid |
| division_id | uuid |
| wins | int |
| losses | int |
| ties | int |
| games_played | int |
| sets_won | int |
| sets_lost | int |
| points_for | int |
| points_against | int |
| point_differential | int |
| standing_points | int |
| win_percentage | numeric |
| current_streak | text |
| last_five | text |
| rank | int |
| created_at | timestamptz |
| updated_at | timestamptz |

### games_needing_stats

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| season_id | uuid |
| event_date | date |
| opponent_name | text |
| our_score | int |
| opponent_score | int |
| game_result | text |
| team_name | text |
| team_color | text |
| season_name | text |

## Engagement & Achievements

### achievements

| Column | Type |
|--------|------|
| id | uuid |
| name | text |
| description | text |
| how_to_earn | text |
| category | text |
| type | text |
| rarity | text |
| stat_key | text |
| threshold | int |
| threshold_type | text |
| requires_verification | bool |
| icon | text |
| icon_url | text |
| color_primary | text |
| color_secondary | text |
| color_glow | text |
| banner_gradient | text |
| sport | text |
| is_active | bool |
| display_order | int |
| created_at | timestamptz |
| frame_url | text |
| glow_url | text |
| unlock_effect_url | text |
| xp_reward | int |
| target_role | text |

### player_achievements

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| achievement_id | uuid |
| earned_at | timestamptz |
| game_id | uuid |
| team_id | uuid |
| season_id | uuid |
| stat_value_at_unlock | int |
| verified_by | uuid |
| verified_at | timestamptz |
| created_at | timestamptz |

### player_achievement_progress

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| achievement_id | uuid |
| current_value | int |
| target_value | int |
| last_updated_game_id | uuid |
| last_updated_at | timestamptz |
| created_at | timestamptz |

### player_tracked_achievements

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| achievement_id | uuid |
| display_order | int |
| tracked_at | timestamptz |

### user_achievements

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid |
| achievement_id | uuid |
| earned_at | timestamptz |
| stat_value_at_unlock | int |
| season_id | uuid |

### player_badges

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| badge_type | text |
| badge_name | text |
| awarded_by | uuid |
| awarded_at | timestamp |
| notes | text |

### shoutouts

| Column | Type |
|--------|------|
| id | uuid |
| giver_id | uuid |
| giver_role | text |
| receiver_id | uuid |
| receiver_role | text |
| team_id | uuid |
| organization_id | uuid |
| category_id | uuid |
| category | text |
| message | text |
| show_on_team_wall | bool |
| post_id | uuid |
| created_at | timestamptz |

### shoutout_categories

| Column | Type |
|--------|------|
| id | uuid |
| name | text |
| emoji | text |
| description | text |
| color | text |
| is_default | bool |
| organization_id | uuid |
| created_by | uuid |
| is_active | bool |
| created_at | timestamptz |

### coach_challenges

| Column | Type |
|--------|------|
| id | uuid |
| coach_id | uuid |
| team_id | uuid |
| organization_id | uuid |
| title | text |
| description | text |
| challenge_type | text |
| metric_type | text |
| stat_key | text |
| target_value | int |
| xp_reward | int |
| badge_id | uuid |
| custom_reward_text | text |
| starts_at | timestamptz |
| ends_at | timestamptz |
| status | text |
| post_id | uuid |
| created_at | timestamptz |

### challenge_participants

| Column | Type |
|--------|------|
| id | uuid |
| challenge_id | uuid |
| player_id | uuid |
| current_value | int |
| completed | bool |
| completed_at | timestamptz |
| contribution | int |
| opted_in_at | timestamptz |

### xp_ledger

| Column | Type |
|--------|------|
| id | uuid |
| player_id | uuid |
| organization_id | uuid |
| xp_amount | int |
| source_type | text |
| source_id | uuid |
| description | text |
| created_at | timestamptz |

## Team Wall / Social

### team_posts

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| author_id | uuid |
| post_type | text |
| title | text |
| content | text |
| media_urls | array |
| is_pinned | bool |
| is_published | bool |
| expires_at | timestamptz |
| reaction_count | int |
| comment_count | int |
| created_at | timestamptz |
| updated_at | timestamptz |
| share_count | int |

### team_post_comments

| Column | Type |
|--------|------|
| id | uuid |
| post_id | uuid |
| author_id | uuid |
| parent_comment_id | uuid |
| content | text |
| is_deleted | bool |
| deleted_at | timestamptz |
| deleted_by | uuid |
| created_at | timestamptz |
| updated_at | timestamptz |

### team_post_reactions

| Column | Type |
|--------|------|
| id | uuid |
| post_id | uuid |
| user_id | uuid |
| reaction_type | text |
| created_at | timestamptz |

### post_reactions

| Column | Type |
|--------|------|
| id | uuid |
| post_id | uuid |
| user_id | uuid |
| reaction_type | text |
| created_at | timestamptz |

## Chat / Messaging

### chat_channels

| Column | Type |
|--------|------|
| id | uuid |
| season_id | uuid |
| team_id | uuid |
| name | text |
| description | text |
| avatar_url | text |
| channel_type | text |
| created_by | uuid |
| is_archived | bool |
| created_at | timestamptz |
| updated_at | timestamptz |

### channel_members

| Column | Type |
|--------|------|
| id | uuid |
| channel_id | uuid |
| user_id | uuid |
| display_name | text |
| member_role | text |
| can_post | bool |
| can_moderate | bool |
| is_muted | bool |
| last_read_at | timestamptz |
| last_read_message_id | uuid |
| joined_at | timestamptz |
| left_at | timestamptz |

### chat_messages

| Column | Type |
|--------|------|
| id | uuid |
| channel_id | uuid |
| sender_id | uuid |
| message_type | text |
| content | text |
| reply_to_id | uuid |
| is_pinned | bool |
| is_edited | bool |
| is_deleted | bool |
| deleted_by | uuid |
| created_at | timestamptz |
| edited_at | timestamptz |
| deleted_at | timestamptz |
| reactions | jsonb |
| metadata | jsonb |

### typing_indicators

| Column | Type |
|--------|------|
| channel_id | uuid |
| user_id | uuid |
| started_at | timestamptz |

### messages

| Column | Type |
|--------|------|
| id | uuid |
| season_id | uuid |
| sender_id | uuid |
| title | text |
| body | text |
| message_type | text |
| priority | text |
| target_type | text |
| target_team_id | uuid |
| requires_acknowledgment | bool |
| total_recipients | int |
| acknowledged_count | int |
| created_at | timestamptz |

### message_recipients

| Column | Type |
|--------|------|
| id | uuid |
| message_id | uuid |
| player_id | uuid |
| recipient_name | text |
| recipient_email | text |
| recipient_phone | text |
| recipient_type | text |
| acknowledged | bool |
| acknowledged_at | timestamptz |
| delivered | bool |
| delivered_at | timestamptz |
| delivery_method | text |
| created_at | timestamptz |
| profile_id | uuid |

### message_attachments

| Column | Type |
|--------|------|
| id | uuid |
| message_id | uuid |
| attachment_type | text |
| file_url | text |
| file_name | text |
| file_size | int |
| mime_type | text |
| width | int |
| height | int |
| duration_seconds | int |
| thumbnail_url | text |
| created_at | timestamptz |

### message_reactions

| Column | Type |
|--------|------|
| id | uuid |
| message_id | uuid |
| user_id | uuid |
| reaction_type | text |
| created_at | timestamptz |

### message_reports

| Column | Type |
|--------|------|
| id | uuid |
| message_id | uuid |
| reported_by | uuid |
| reason | text |
| details | text |
| status | text |
| reviewed_by | uuid |
| reviewed_at | timestamptz |
| resolution_notes | text |
| created_at | timestamptz |

## Notifications

### notifications

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid |
| title | text |
| body | text |
| type | text |
| event_id | uuid |
| team_id | uuid |
| read | bool |
| read_at | timestamptz |
| created_at | timestamptz |
| data | jsonb |

### notification_preferences

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid |
| volunteer_requests | bool |
| rsvp_reminders | bool |
| event_updates | bool |
| game_reminders | bool |
| created_at | timestamptz |
| updated_at | timestamptz |

### notification_templates

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| name | text |
| type | text |
| title_template | text |
| body_template | text |
| trigger_event | text |
| is_active | bool |
| created_at | timestamptz |
| updated_at | timestamptz |

### admin_notifications

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| type | text |
| title | text |
| message | text |
| player_id | uuid |
| team_id | uuid |
| season_id | uuid |
| is_read | bool |
| read_at | timestamptz |
| read_by | uuid |
| metadata | jsonb |
| created_at | timestamptz |
| updated_at | timestamptz |

### email_notifications

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| recipient_email | text |
| recipient_name | text |
| type | text |
| data | jsonb |
| status | text |
| created_at | timestamptz |
| sent_at | timestamptz |
| error_message | text |
| external_id | text |

### email_logs

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| season_id | uuid |
| player_id | uuid |
| family_email | text |
| email_type | text |
| subject | text |
| content | text |
| status | text |
| sent_at | timestamptz |
| created_at | timestamptz |

### push_tokens

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid |
| token | text |
| device_type | text |
| created_at | timestamptz |
| updated_at | timestamptz |

### announcements

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| season_id | uuid |
| title | text |
| body | text |
| announcement_type | text |
| priority | text |
| target_type | text |
| target_team_id | uuid |
| created_by | uuid |
| is_active | bool |
| is_pinned | bool |
| total_recipients | int |
| read_count | int |
| published_at | timestamptz |
| expires_at | timestamptz |
| created_at | timestamptz |
| updated_at | timestamptz |

### announcement_reads

| Column | Type |
|--------|------|
| id | uuid |
| announcement_id | uuid |
| user_id | uuid |
| read_at | timestamptz |

## Waivers

### waivers

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| name | text |
| description | text |
| content | text |
| waiver_type | text |
| is_required | bool |
| is_active | bool |
| sort_order | int |
| created_at | timestamptz |
| updated_at | timestamptz |

### waiver_templates

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| name | text |
| description | text |
| content | text |
| pdf_url | text |
| type | text |
| sport_id | uuid |
| season_id | uuid |
| is_required | bool |
| is_active | bool |
| requires_signature | bool |
| sort_order | int |
| org_logo_on_waiver | bool |
| version | int |
| last_edited_by | uuid |
| last_edited_at | timestamptz |
| created_at | timestamptz |
| updated_at | timestamptz |

### waiver_signatures

| Column | Type |
|--------|------|
| id | uuid |
| waiver_template_id | uuid |
| player_id | uuid |
| organization_id | uuid |
| season_id | uuid |
| signed_by_name | text |
| signed_by_email | text |
| signed_by_user_id | uuid |
| signed_by_relation | text |
| signature_data | text |
| ip_address | text |
| user_agent | text |
| status | text |
| waiver_version | int |
| signed_at | timestamptz |
| revoked_at | timestamptz |
| expires_at | timestamptz |
| created_at | timestamptz |

### waiver_sends

| Column | Type |
|--------|------|
| id | uuid |
| waiver_template_id | uuid |
| organization_id | uuid |
| player_id | uuid |
| sent_to_email | text |
| sent_to_name | text |
| sent_by | uuid |
| sent_at | timestamptz |
| opened_at | timestamptz |
| signed_at | timestamptz |
| status | text |
| created_at | timestamptz |

### waiver_edit_history

| Column | Type |
|--------|------|
| id | uuid |
| waiver_template_id | uuid |
| edited_by | uuid |
| edited_by_name | text |
| version | int |
| change_summary | text |
| previous_content | text |
| created_at | timestamptz |

## Jerseys

### jersey_assignments

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| sport_id | uuid |
| team_id | uuid |
| player_id | uuid |
| jersey_number | int |
| first_assigned_season_id | uuid |
| last_active_season_id | uuid |
| assigned_at | timestamptz |
| status | text |
| needs_jersey_order | bool |
| current_jersey_size | text |
| jersey_ordered_at | timestamptz |
| assigned_by | uuid |
| notes | text |
| created_at | timestamptz |
| updated_at | timestamptz |

### jersey_assignment_history

| Column | Type |
|--------|------|
| id | uuid |
| jersey_assignment_id | uuid |
| player_id | uuid |
| jersey_number | int |
| team_id | uuid |
| action | text |
| previous_number | int |
| season_id | uuid |
| performed_by | uuid |
| performed_at | timestamptz |
| reason | text |

### v_jersey_alerts

| Column | Type |
|--------|------|
| organization_id | uuid |
| team_id | uuid |
| team_name | text |
| player_id | uuid |
| player_name | text |
| jersey_number | int |
| needs_jersey_order | bool |
| current_jersey_size | text |
| requested_size | text |
| assignment_reason | text |
| assigned_at | timestamptz |
| alert_type | text |
| alert_message | text |

### v_jersey_status

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| sport_id | uuid |
| sport_name | text |
| team_id | uuid |
| team_name | text |
| player_id | uuid |
| first_name | text |
| last_name | text |
| player_name | text |
| jersey_number | int |
| status | text |
| needs_jersey_order | bool |
| current_jersey_size | text |
| first_assigned_season_id | uuid |
| last_active_season_id | uuid |
| assigned_at | timestamptz |
| jersey_pref_1 | int |
| jersey_pref_2 | int |
| jersey_pref_3 | int |

## Invitations & Accounts

### invitations

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| invite_type | text |
| email | text |
| player_id | uuid |
| team_id | uuid |
| invite_code | text |
| invited_by | uuid |
| invited_at | timestamptz |
| expires_at | timestamptz |
| status | text |
| accepted_at | timestamptz |
| accepted_by | uuid |

### account_invites

| Column | Type |
|--------|------|
| id | uuid |
| email | text |
| phone | text |
| player_id | uuid |
| invite_token | text |
| status | text |
| sent_at | timestamptz |
| accepted_at | timestamptz |
| accepted_by | uuid |
| expires_at | timestamptz |
| created_at | timestamptz |

## Platform Admin

### platform_subscriptions

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| plan_tier | text |
| status | text |
| billing_cycle | text |
| price_cents | int |
| trial_ends_at | timestamptz |
| current_period_start | timestamptz |
| current_period_end | timestamptz |
| stripe_subscription_id | text |
| cancelled_at | timestamptz |
| created_at | timestamptz |
| updated_at | timestamptz |

### platform_invoices

| Column | Type |
|--------|------|
| id | uuid |
| subscription_id | uuid |
| organization_id | uuid |
| amount_cents | int |
| status | text |
| invoice_date | date |
| due_date | date |
| paid_at | timestamptz |
| stripe_invoice_id | text |
| created_at | timestamptz |

### platform_admin_actions

| Column | Type |
|--------|------|
| id | uuid |
| admin_id | uuid |
| action_type | text |
| target_type | text |
| target_id | uuid |
| details | jsonb |
| created_at | timestamptz |

## Views

### v_season_standings

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| season_id | uuid |
| division_id | uuid |
| wins | int |
| losses | int |
| ties | int |
| games_played | int |
| sets_won | int |
| sets_lost | int |
| points_for | int |
| points_against | int |
| point_differential | int |
| standing_points | int |
| win_percentage | numeric |
| current_streak | text |
| last_five | text |
| rank | int |
| created_at | timestamptz |
| updated_at | timestamptz |
| team_name | text |
| season_name | text |
| record | text |
| set_record | text |
| point_diff_formatted | text |

### v_jersey_alerts

| Column | Type |
|--------|------|
| organization_id | uuid |
| team_id | uuid |
| team_name | text |
| player_id | uuid |
| player_name | text |
| jersey_number | int |
| needs_jersey_order | bool |
| current_jersey_size | text |
| requested_size | text |
| assignment_reason | text |
| assigned_at | timestamptz |
| alert_type | text |
| alert_message | text |

### v_jersey_status

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| sport_id | uuid |
| sport_name | text |
| team_id | uuid |
| team_name | text |
| player_id | uuid |
| first_name | text |
| last_name | text |
| player_name | text |
| jersey_number | int |
| status | text |
| needs_jersey_order | bool |
| current_jersey_size | text |
| first_assigned_season_id | uuid |
| last_active_season_id | uuid |
| assigned_at | timestamptz |
| jersey_pref_1 | int |
| jersey_pref_2 | int |
| jersey_pref_3 | int |

### external_league_status_view

| Column | Type |
|--------|------|
| id | uuid |
| organization_id | uuid |
| league_name | text |
| facility_name | text |
| registration_deadline | date |
| forms_due | date |
| team_registration_fee | numeric |
| season_start | date |
| season_end | date |
| teams_registered | bigint |
| total_fees | numeric |
| total_paid | numeric |
| outstanding | numeric |
| planned_count | bigint |
| registered_count | bigint |
| paid_count | bigint |
| confirmed_count | bigint |
| deadline_passed | bool |
| forms_overdue | bool |

### games_needing_stats

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| season_id | uuid |
| event_date | date |
| opponent_name | text |
| our_score | int |
| opponent_score | int |
| game_result | text |
| team_name | text |
| team_color | text |
| season_name | text |

## Other Tables

### game_player_stats

| Column | Type |
|--------|------|
| id | uuid |
| event_id | uuid |
| player_id | uuid |
| team_id | uuid |
| serves | int |
| aces | int |
| service_errors | int |
| attacks | int |
| kills | int |
| attack_errors | int |
| blocks | int |
| block_assists | int |
| block_errors | int |
| digs | int |
| dig_errors | int |
| assists | int |
| set_errors | int |
| receptions | int |
| reception_errors | int |
| points | int |
| field_goals_made | int |
| field_goals_attempted | int |
| three_pointers_made | int |
| three_pointers_attempted | int |
| free_throws_made | int |
| free_throws_attempted | int |
| rebounds | int |
| offensive_rebounds | int |
| defensive_rebounds | int |
| steals | int |
| turnovers | int |
| fouls | int |
| goals | int |
| soccer_assists | int |
| shots | int |
| shots_on_target | int |
| saves | int |
| yellow_cards | int |
| red_cards | int |
| minutes_played | int |
| games_started | bool |
| created_at | timestamptz |
| updated_at | timestamptz |
| created_by | uuid |
| game_id | uuid |
| season_id | uuid |
| sport | text |
| entered_by | uuid |
| at_bats | int |
| hits | int |
| runs | int |
| rbis | int |
| strikeouts | int |
| walks | int |
| passing_yards | int |
| rushing_yards | int |
| touchdowns | int |
| penalties | int |
| errors | int |
| fg_made | int |
| fg_att | int |
| three_made | int |
| three_att | int |
| ft_made | int |
| ft_att | int |
| shots_against | int |
| doubles | int |
| triples | int |
| home_runs | int |
| stolen_bases | int |
| pass_att | int |
| completions | int |
| passing_tds | int |
| interceptions | int |
| rush_att | int |
| rushing_tds | int |
| receiving_yards | int |
| receiving_tds | int |
| tackles | int |
| sacks | int |
| plus_minus | int |
| power_play_goals | int |
| short_handed_goals | int |
| fgm | int |
| fga | int |
| three_pm | int |
| three_pa | int |
| ftm | int |
| fta | int |
| pass_attempts | int |
| rush_attempts | int |
| targets | int |
