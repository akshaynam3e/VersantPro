<?php
require_once __DIR__ . '/../config.php';
header_remove('X-Powered-By');

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $isHttps,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), geolocation=(), microphone=(self)');
if ($isHttps) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

function e(?string $value): string {
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function valid_csrf(?string $token): bool {
    return is_string($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

function page_start(string $title, string $description, string $canonicalPath = ''): void {
    $canonical = 'https://versantpro.in/' . ltrim($canonicalPath ?: basename($_SERVER['SCRIPT_NAME'] ?? 'index.php'), '/');
    if ($canonicalPath === 'index.php' || $canonicalPath === '') {
        $canonical = 'https://versantpro.in/';
    }
    ?>
<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($title) ?></title>
  <meta name="description" content="<?= e($description) ?>">
  <meta name="keywords" content="versant test, versant practice test, English fluency test, speaking practice, listening practice, English typing test">
  <meta name="theme-color" content="#0b1020">
  <link rel="canonical" href="<?= e($canonical) ?>">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header">
  <div class="shell nav-wrap">
    <a class="brand" href="index.php" aria-label="Versant Practice Pro home"><span class="brand-mark">V</span><span>Versant<span class="brand-accent">Pro</span></span></a>
    <nav class="main-nav" aria-label="Primary navigation">
      <a href="index.php">Home</a>
      <a href="practice.php">Practice test</a>
      <a href="dashboard.php">Progress</a>
    </nav>
    <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to light theme"><span aria-hidden="true">☼</span><span class="theme-label">Light mode</span></button>
  </div>
</header>
<main id="main-content">
<?php
}

function page_end(): void {
    ?>
</main>
<footer class="site-footer"><div class="shell footer-row"><span>© <?= date('Y') ?> VersantPro</span><span>Build clear English. Speak with confidence.</span></div></footer>
<script src="assets/js/script.js" defer></script>
</body>
</html>
<?php
}
?>
