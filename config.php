<?php
// Keep credentials outside the web root and provide OPENROUTER_API_KEY as a server environment variable.
define('OPENROUTER_API_KEY', getenv('OPENROUTER_API_KEY') ?: '');
define('OPENROUTER_MODEL', getenv('OPENROUTER_MODEL') ?: 'openai/gpt-oss-120b:free');
define('OPENROUTER_TIMEOUT', 25);
?>
