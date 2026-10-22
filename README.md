# VersantPro Practice Pro

A small PHP site for Versant-style English practice.

## Secure setup

Set the OpenRouter credential as a server environment variable. Do not put it in `config.php` or commit it to a repository.

```bash
export OPENROUTER_API_KEY='your-key-here'
```

The web server must run PHP with cURL enabled. The app uses the key only on the server when `/api/generate.php` receives a valid same-origin, CSRF-protected request.

## Pages

- `index.php` — SEO-friendly landing page
- `practice.php` — AI question generation and local progress tracking
- `dashboard.php` — local XP, streak, history and chart

The site includes responsive styling, keyboard-friendly controls, a persisted dark/light theme, security headers, input allowlists, a short server-side rate limit, and a sitemap/robots file.
