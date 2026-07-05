# myFinalsCup — Follow-ups (do later)

## DONE — Auth email & trust fixes (completed 2026-07-05)
- [x] Fixed Supabase Site URL -> `https://www.myfinalscup.com` (was localhost:3000,
      which broke every confirmation link for new users).
- [x] Redirect URLs allow-list includes `https://www.myfinalscup.com/**`
      (v0 preview redirect URLs kept for in-editor testing).
- [x] Custom SMTP via Resend — auth emails now send from
      `no-reply@myfinalscup.com` (sender "myFinalsCup"), not "Supabase Auth".
      - Domain `myfinalscup.com` verified in Resend (DKIM + SPF + MX live in GoDaddy DNS).
      - Supabase -> Authentication -> Emails -> Custom SMTP enabled (smtp.resend.com).
- [x] Branded HTML email templates pasted into Supabase (confirm signup,
      reset password, magic link). Source of truth: `supabase/email-templates/`.
- [x] In-app post-signup reminder dialog explaining where the email comes from.
- [x] Verified send path end-to-end (Supabase -> Resend returns 200 + confirmation_sent_at).

Monitoring tip: Resend Dashboard -> Logs shows every sent email + deliverability.

## 1. Activate Stripe (payments / donations)
- [ ] Install/connect the Stripe integration.
- [ ] Wire up checkout for donations (20% to U.S. Soccer Foundation) / any paid features.
- [ ] Switch Stripe from test mode to live keys before launch.
