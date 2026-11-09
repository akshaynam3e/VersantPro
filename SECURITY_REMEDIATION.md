# VersantPro security remediation and deployment notes

## Repository changes in this archive

- Added a restrictive browser Content Security Policy and `strict-origin-when-cross-origin` referrer policy to every HTML page.
- Added `_headers` for hosts that support the Netlify/Cloudflare Pages headers-file convention. It sets CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a Referrer Policy, and a Permissions Policy.
- Added equivalent Apache and Nginx header snippets in `security/`. Added an early, best-effort frame-busting script as a fallback for the current static host; it is not a substitute for a response header.
- Escaped recognized speech before rendering it as HTML and stopped trusting saved `localStorage` HTML during page restoration.
- Added `.gitignore` rules for local environment files, private keys, and backup files. No `.env`, `.git` directory, private key, or backup artifact was found in the supplied archive.

The CSP allows inline scripts and styles because this static site currently contains inline JavaScript, event handlers, and CSS. This is a compatibility-oriented policy, not the strictest possible CSP; a future refactor to external scripts/styles plus nonces or hashes would let you remove `unsafe-inline`.

## Important: response headers and the current host

The repository contains a `CNAME` for `versantpro.in`, indicating GitHub Pages custom-domain hosting. GitHub Pages does not read `_headers`, `.htaccess`, or Nginx snippets, so those files do not change response headers while the site remains directly hosted on GitHub Pages. The HTML CSP/referrer metadata still applies in browsers, but `frame-ancestors`, `X-Frame-Options`, and `X-Content-Type-Options` must be sent as HTTP response headers to fully address the corresponding findings.

To complete header remediation, deploy behind a host/CDN that supports response-header rules (for example, Cloudflare Pages/Workers or a reverse proxy), then apply `_headers` or the matching server snippet. Verify the live response after deployment with `curl -I https://versantpro.in/` and confirm all four headers are present. Do not mark the live-site findings resolved until the response is verified.

## DNS findings require DNS-provider access

A ZIP cannot change DNS. Add these records at the authoritative DNS provider, using values supplied by your email provider and web host:

- **SPF:** publish one TXT record at the root (`@`) authorizing only the systems that send mail for your domain. Do not create multiple SPF records; merge authorized senders into one record. The correct `include:` value depends on your mail provider.
- **DKIM:** publish the selector-specific TXT or CNAME record(s) provided by your mail service. DKIM has no safe universal value; copying one from another provider will not authenticate your mail.
- **CAA:** publish a CAA record permitting only the certificate authorities you intentionally use for this domain. Confirm the CA used for current/renewal certificates before adding it to avoid blocking renewal.
- **DNSSEC:** enable signing at the DNS host, then publish/confirm the DS record at the registrar. DNSSEC must be enabled consistently across DNS host and registrar.

After changes, verify with DNS tools and rerun the same scanner. These records cannot be safely guessed or activated from project files.

## Firebase and API security: verify in Firebase Console

The frontend includes a Firebase web API key and Firebase project identifiers. Firebase web API keys are public client identifiers, not authorization secrets; access control must be enforced by Firebase Security Rules and API-key restrictions. The supplied archive does not include the deployed Firestore rules, Firebase project settings, or trusted server-side authorization, so database access cannot be certified or changed here.

Before release:

1. In Firebase Console, review Firestore Rules for every collection used by this site (`questions`, `feedback`, `users/{uid}/assessmentResults`, `assessmentResults`, `practiceResults`, and `results`). Require authentication where appropriate, enforce `request.auth.uid` ownership for learner records, and reserve admin writes/reads for trusted admin claims or an explicit server-controlled allowlist. Never rely on the HTML admin-email checks as the security boundary.
2. Test rules in the Firebase Rules Playground or Emulator: unauthenticated reads/writes, one user's access to another user's records, and non-admin reads/writes to admin data should be denied.
3. Restrict the Google API key by allowed HTTP referrers (the production domain and any required development origin) and only the APIs the site needs. Check Firebase Authentication authorized domains.
4. Review Firebase Authentication providers, password policy, account recovery, and OAuth authorized domains; enable abuse protections and monitoring.
5. Run dependency and source scanners when the deployment configuration and Firebase rules are available. The supplied static archive has no package manifest or lockfile, so a dependency audit cannot establish whether hosted Firebase SDK usage or the live backend configuration is safe.

## Deployment verification checklist

- Deploy to a host that actually applies response headers, then verify the live headers and test sign-in, Firebase reads/writes, speech recognition, and all pages under CSP.
- Verify `.env`, `.git`, backup files, and private-key files are not web-accessible.
- Apply and verify SPF, DKIM, CAA, and DNSSEC at the DNS provider; rerun the external scan.
- Treat scanner status as evidence only after rescanning the deployed site. This archive alone cannot alter DNS, GitHub Pages response headers, Firebase rules, or other live account settings.
