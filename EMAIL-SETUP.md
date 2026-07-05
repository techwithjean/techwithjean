# Custom SMTP Setup — send auth emails from myfinalscup.com

Goal: auth emails (confirm signup, reset password, magic link) arrive **from
`no-reply@myfinalscup.com`** instead of "Supabase Auth", so friends trust them.

Provider: **Resend**  |  DNS host: **GoDaddy** (nameservers: domaincontrol.com)
Supabase project: supabase-fuchsia-jacket

---

## Phase 1 — Create Resend account & add the domain
1. Go to https://resend.com and sign up (free tier = 3,000 emails/mo, 100/day).
2. Verify your email, then in the dashboard go to **Domains -> Add Domain**.
3. Enter: `myfinalscup.com`  ->  Add.
4. Choose region (pick the one closest to most users, e.g. `us-east-1`).
5. Resend now shows a list of DNS records to add. Keep this tab open — you'll
   copy them into GoDaddy in Phase 2. They look like:
   - **MX**   record on `send` (mail feedback)        e.g. `feedback-smtp.us-east-1.amazonses.com` (priority 10)
   - **TXT**  record on `send` (SPF)                  e.g. `v=spf1 include:amazonses.com ~all`
   - **TXT**  record on `resend._domainkey` (DKIM)    long `p=...` value
   - (optional) **TXT** DMARC on `_dmarc`             `v=DMARC1; p=none;`

> The exact host names/values are generated per-account. ALWAYS copy the values
> Resend shows you — the above are examples of the shape only.

---

## Phase 2 — Add the records in GoDaddy
1. Log in at https://dcc.godaddy.com/control/portfolio (GoDaddy Domain Portfolio).
2. Click `myfinalscup.com` -> **DNS** (or "Manage DNS").
3. For EACH record Resend listed, click **Add New Record** and fill:
   - Type: match Resend (MX / TXT / CNAME)
   - Name/Host: the subdomain part ONLY. GoDaddy auto-appends the domain.
     - If Resend says `send.myfinalscup.com`, enter `send` in GoDaddy.
     - If Resend says `resend._domainkey.myfinalscup.com`, enter `resend._domainkey`.
   - Value/Points to: paste exactly from Resend.
   - Priority (MX only): the number Resend shows (usually 10).
   - TTL: leave default (1 hour).
4. Save each record.

Notes / gotchas:
- Do NOT delete the existing `google-site-verification` TXT — leave it.
- If GoDaddy complains a value ends in a dot, remove the trailing dot.
- Only ONE SPF record per domain. There is none today, so you're fine.

---

## Phase 3 — Verify in Resend
1. Back in Resend Domains, click **Verify** (or wait — it auto-checks).
2. DNS can take 5–60 min to propagate. Status goes to **Verified** (green).
3. Tell me when you've added the records and I'll confirm propagation for you
   from here (I can query the live DNS).

---

## Phase 4 — Get SMTP credentials from Resend
1. In Resend, go to **API Keys -> Create API Key** (name it "supabase-smtp",
   permission: Sending access). Copy the key (starts with `re_...`). Save it —
   shown only once.
2. Resend SMTP connection details (same for every account):
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (TLS)
   - Username: `resend`
   - Password: the `re_...` API key you just created

---

## Phase 5 — Configure Supabase Custom SMTP
1. Supabase Dashboard -> **Project Settings -> Authentication** (or
   **Authentication -> Emails -> SMTP Settings**).
2. Toggle **Enable Custom SMTP** on. Enter:
   - Sender email: `no-reply@myfinalscup.com`
   - Sender name:  `myFinalsCup`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: `re_...` (the Resend API key)
3. Save.
4. (Recommended) Authentication -> Rate Limits -> raise the email rate limit
   now that you're off Supabase's tiny built-in sender.

---

## Phase 6 — Paste branded templates (if not done) & test
1. Authentication -> Emails -> paste the 3 HTML templates from
   `supabase/email-templates/` (confirm-signup, reset-password, magic-link).
2. Test: sign up with a REAL address you control. The email should now come
   from **myFinalsCup <no-reply@myfinalscup.com>** with the branded design,
   and the confirm link should land on myfinalscup.com.

---

## Status checklist
- [ ] Phase 1 — Resend account + domain added
- [ ] Phase 2 — DNS records added in GoDaddy
- [ ] Phase 3 — Domain shows Verified in Resend
- [ ] Phase 4 — Resend API key created
- [ ] Phase 5 — Supabase Custom SMTP enabled
- [ ] Phase 6 — Templates pasted + real test email received
