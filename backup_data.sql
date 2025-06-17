SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', 'ab29a77a-0c66-494f-951a-aa9c96f0ab8b', '{"action":"user_confirmation_requested","actor_id":"0d4904b2-bf4e-4082-8062-85d13b5e15c9","actor_username":"admin@agendapro.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-06-17 16:54:22.964279+00', ''),
	('00000000-0000-0000-0000-000000000000', '7c11223d-3804-4bad-9f0d-c2ef47313300', '{"action":"user_confirmation_requested","actor_id":"38a845c6-c699-47f3-b51d-8ee1b9ed6508","actor_username":"admin@agendapro.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-06-17 16:58:03.461983+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bdf5ecaf-27f2-47ac-96f3-5f849b8c9733', '{"action":"user_confirmation_requested","actor_id":"e28db4b6-973a-4bde-9f79-d3965dedcf68","actor_username":"admin@agendapro.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-06-17 17:00:59.86618+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ab96fdc3-46ba-42da-87cc-a5871f0125b2', '{"action":"user_confirmation_requested","actor_id":"363c1259-ee80-4ea4-abdd-e81707055484","actor_username":"admin@agendapro.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-06-17 17:03:23.105111+00', ''),
	('00000000-0000-0000-0000-000000000000', '9903e35a-e13f-429c-9914-f75d7be03c25', '{"action":"user_confirmation_requested","actor_id":"1653af91-9c08-4954-acc9-59c3029e1ddd","actor_username":"admin@agendapro.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-06-17 17:20:46.736786+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fcc01dfc-1254-4752-8078-4247d5c59b73', '{"action":"user_confirmation_requested","actor_id":"385089f3-1483-4e52-81db-a02cff1dde2c","actor_username":"admin@agendapro.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-06-17 17:25:08.143094+00', ''),
	('00000000-0000-0000-0000-000000000000', '512ce646-6314-482e-b301-0cce13869080', '{"action":"user_confirmation_requested","actor_id":"385089f3-1483-4e52-81db-a02cff1dde2c","actor_username":"admin@agendapro.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-06-17 17:33:25.456283+00', ''),
	('00000000-0000-0000-0000-000000000000', '370857f4-45ed-4b6e-b83d-36b896bc4d0a', '{"action":"login","actor_id":"385089f3-1483-4e52-81db-a02cff1dde2c","actor_username":"admin@agendapro.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-06-17 17:39:15.260723+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '385089f3-1483-4e52-81db-a02cff1dde2c', 'authenticated', 'authenticated', 'admin@agendapro.com', '$2a$10$DTQuxeW6GWtlC6kyIxQus./ov6dWl0cYG.xUqtgwR4XTqNS6L6RZC', '2025-06-17 17:38:34.651024+00', NULL, '387674bfd69ff50df58ed782bba1363a3e6ed2827517c2d155883625', '2025-06-17 17:33:25.45881+00', '', NULL, '', '', NULL, '2025-06-17 17:39:15.262563+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "385089f3-1483-4e52-81db-a02cff1dde2c", "email": "admin@agendapro.com", "email_verified": false, "phone_verified": false}', NULL, '2025-06-17 17:25:08.134952+00', '2025-06-17 17:39:15.270562+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('385089f3-1483-4e52-81db-a02cff1dde2c', '385089f3-1483-4e52-81db-a02cff1dde2c', '{"sub": "385089f3-1483-4e52-81db-a02cff1dde2c", "email": "admin@agendapro.com", "email_verified": false, "phone_verified": false}', 'email', '2025-06-17 17:25:08.14018+00', '2025-06-17 17:25:08.14023+00', '2025-06-17 17:25:08.14023+00', '691d272c-b494-4183-804e-531fb2f02954');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag") VALUES
	('3a4d28ab-332a-4549-b44b-46b39c67cc03', '385089f3-1483-4e52-81db-a02cff1dde2c', '2025-06-17 17:39:15.263061+00', '2025-06-17 17:39:15.263061+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', '190.28.195.47', NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('3a4d28ab-332a-4549-b44b-46b39c67cc03', '2025-06-17 17:39:15.271295+00', '2025-06-17 17:39:15.271295+00', 'password', '59b30e56-ffac-45e0-b20d-73f5c34e0e1f');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") VALUES
	('9ea94f9d-57d9-4e6c-827d-3b42f31aa9b8', '385089f3-1483-4e52-81db-a02cff1dde2c', 'confirmation_token', '387674bfd69ff50df58ed782bba1363a3e6ed2827517c2d155883625', 'admin@agendapro.com', '2025-06-17 17:33:25.659979', '2025-06-17 17:33:25.659979');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 5, 'icy66vcg4527', '385089f3-1483-4e52-81db-a02cff1dde2c', false, '2025-06-17 17:39:15.26455+00', '2025-06-17 17:39:15.26455+00', NULL, '3a4d28ab-332a-4549-b44b-46b39c67cc03');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."usuarios" ("id", "nombre", "created_at") VALUES
	('385089f3-1483-4e52-81db-a02cff1dde2c', 'Admin User', '2025-06-17 17:25:08.134621+00');


--
-- Data for Name: citas; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: configuracion; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."configuracion" ("key", "valor", "updated_at") VALUES
	('backup_admin_created', 'true', '2025-06-17 16:04:15.145535+00'),
	('backup_admin_email', 'admin@agendapro.com', '2025-06-17 16:04:15.145535+00');


--
-- Data for Name: personal; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_roles" ("user_id", "rol") VALUES
	('385089f3-1483-4e52-81db-a02cff1dde2c', 'admin');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 5, true);


--
-- PostgreSQL database dump complete
--

RESET ALL;
