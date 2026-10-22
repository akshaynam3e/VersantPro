<?php require_once __DIR__ . '/includes/bootstrap.php'; page_start('Versant Practice Test | English Fluency Questions', 'Generate Versant-style English practice questions by topic and difficulty, then track your response speed.', 'practice.php'); ?>
<section class="shell form-shell"><p class="eyebrow">Practice test</p><h1>One prompt at a time.</h1><p class="lede">Choose a topic, generate a question and type your response under a little time pressure.</p>
  <div class="panel">
    <meta name="csrf-token" content="<?= e(csrf_token()) ?>">
    <div class="form-grid"><label for="topic">Topic<select class="select" id="topic"><option value="technology">Technology</option><option value="business">Business</option><option value="education">Education</option><option value="daily-life">Daily life</option></select></label><label for="difficulty">Difficulty<select class="select" id="difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Challenging</option></select></label></div>
    <div class="actions"><button class="btn" type="button" data-generate onclick="generateQuestion()">Generate prompt</button></div>
    <div class="practice-question" id="question" aria-live="polite">Choose your settings, then generate a prompt.</div>
    <label for="answer">Your response<textarea id="answer" placeholder="Type your answer here…" maxlength="2000"></textarea></label>
    <div class="actions"><button class="btn secondary" type="button" onclick="submitAnswer()">Save response</button></div><p class="status" id="status" role="status" aria-live="polite"></p>
  </div>
</section>
<?php page_end(); ?>
