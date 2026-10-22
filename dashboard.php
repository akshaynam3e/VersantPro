<?php require_once __DIR__ . '/includes/bootstrap.php'; page_start('Versant Practice Progress Dashboard', 'Review your Versant practice test speed, sessions, XP and learning streak.', 'dashboard.php'); ?>
<section class="shell section"><p class="eyebrow">Your progress</p><h1>Small sessions add up.</h1><p class="lede">Your practice history stays in this browser, so you can return to your progress without an account.</p>
  <div class="stats"><div class="stat"><span>Total XP</span><strong id="xp">0</strong></div><div class="stat"><span>Practice streak</span><strong id="streak">0</strong></div><div class="stat"><span>Sessions</span><strong id="sessions">0</strong></div></div>
  <div class="panel"><div class="section-head"><h2>Response speed</h2><p class="muted">Words per minute across your latest sessions.</p></div><div class="chart-wrap"><canvas id="chart" aria-label="Line chart of response speed" role="img"></canvas></div></div>
  <a class="btn" href="practice.php">Practice again</a>
</section>
<?php page_end(); ?>
