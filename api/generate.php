<?php
require_once __DIR__ . '/../includes/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); header('Allow: POST'); echo json_encode(['error' => 'Method not allowed']); exit;
}
if (!valid_csrf($_POST['csrf_token'] ?? null)) {
    http_response_code(403); echo json_encode(['error' => 'Your session token is invalid. Refresh the page and try again.']); exit;
}
$now = time(); $window = $_SESSION['generation_window'] ?? ['start' => $now, 'count' => 0];
if ($now - $window['start'] >= 60) $window = ['start' => $now, 'count' => 0];
if ($window['count'] >= 10) { http_response_code(429); echo json_encode(['error' => 'Please wait a minute before generating more prompts.']); exit; }
$_SESSION['generation_window'] = ['start' => $window['start'], 'count' => $window['count'] + 1];

$topics = ['technology', 'business', 'education', 'daily-life']; $difficulties = ['easy', 'medium', 'hard'];
$topic = strtolower(trim((string)($_POST['topic'] ?? ''))); $difficulty = strtolower(trim((string)($_POST['difficulty'] ?? '')));
if (!in_array($topic, $topics, true) || !in_array($difficulty, $difficulties, true)) { http_response_code(422); echo json_encode(['error' => 'Choose a valid topic and difficulty.']); exit; }
if (OPENROUTER_API_KEY === '') { http_response_code(503); echo json_encode(['error' => 'The question service is not configured yet.']); exit; }

$prompt = "Generate one natural English sentence for a Versant-style fluency practice test. Topic: {$topic}. Difficulty: {$difficulty}. Return only the sentence, with no quotation marks or explanation.";
$payload = json_encode(['model' => OPENROUTER_MODEL, 'messages' => [['role' => 'user', 'content' => $prompt]], 'max_tokens' => 80, 'temperature' => 0.7]);
$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload, CURLOPT_TIMEOUT => OPENROUTER_TIMEOUT, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . OPENROUTER_API_KEY, 'Content-Type: application/json', 'HTTP-Referer: https://versantpro.in', 'X-Title: VersantPro']]);
$response = curl_exec($ch); $curlError = curl_error($ch); $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
if ($response === false || $curlError || $status < 200 || $status >= 300) { http_response_code(502); echo json_encode(['error' => 'The question service is temporarily unavailable.']); exit; }
$data = json_decode($response, true); $question = trim((string)($data['choices'][0]['message']['content'] ?? ''));
if ($question === '' || strlen($question) > 500) { http_response_code(502); echo json_encode(['error' => 'The question service returned an invalid prompt.']); exit; }
echo json_encode(['question' => $question], JSON_UNESCAPED_UNICODE);
