# myFinalsCup — Follow-ups (do later)

## 0. MANUAL: Fix Supabase Site URL (URGENT — blocks new signups)
Confirmation links currently point to `localhost:3000` for new users because the
Supabase project's Site URL is still the dev default.
- [ ] Supabase Dashboard -> Authentication -> URL Configuration
      - Site URL: `https://www.myfinalscup.com`
      - Redirect URLs (allow-list): add `https://www.myfinalscup.com/**`

## 0b. MANUAL: Paste branded email templates into Supabase
Dashboard-only step (can't be done from code). Copy each HTML file's contents:
- [ ] Confirm signup -> paste `supabase/email-templates/confirm-signup.html`
- [ ] Reset password -> paste `supabase/email-templates/reset-password.html`
- [ ] Magic link     -> paste `supabase/email-templates/magic-link.html`
At: Supabase Dashboard -> Authentication -> Emails -> (matching template).
Set subjects too, e.g. "Confirm your myFinalsCup account".

## 1. Custom SMTP so auth emails come from myFinalsCup (Resend)
Goal: emails should be sent from `no-reply@myfinalscup.com` with the sender name
"myFinalsCup" instead of the default "Supabase Auth" / `@supabase.io` address.
This is the biggest trust fix — the branded templates only change the body, not
the sender.

Steps:
- [ ] Create a Resend account (or Postmark / SendGrid / Amazon SES).
- [ ] Verify the domain `myfinalscup.com` in the provider (adds SPF + DKIM records).
- [ ] Add the provided DNS records in Vercel domain DNS settings.
- [ ] In Supabase: Authentication -> Emails -> SMTP Settings -> Enable Custom SMTP.
      - Host / port / username / password from the provider.
      - Sender email: `no-reply@myfinalscup.com`
      - Sender name: `myFinalsCup`
- [ ] Send a test signup and confirm the sender now reads "myFinalsCup".

## 2. Branded email templates (ready to paste — done in code, apply in dashboard)
Templates live in `supabase/email-templates/`:
- [ ] Confirm signup  -> `confirm-signup.html`
- [ ] Reset password  -> `reset-password.html`
- [ ] Magic link      -> `magic-link.html`
Apply each at: Supabase Dashboard -> Authentication -> Emails -> (matching template).
Also set subjects, e.g. "Confirm your myFinalsCup account".

## 3. Activate Stripe (payments / donations)
- [ ] Install/connect the Stripe integration.
- [ ] Wire up checkout for donations (20% to U.S. Soccer Foundation) / any paid features.
- [ ] Switch Stripe from test mode to live keys before launch.
