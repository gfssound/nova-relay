/* Nov 18 (Ferris: "Run the tests automatically on GitHub"): runs the regression tests that need no hardware, one
   after another, and says which passed. Used by .github/workflows/tests.yml on every push, and by hand:
     node test/run_all.js            all of them
     node test/run_all.js diag api   just these
   A test fails on a non-zero exit, or on a FAIL / SCROLLS line, or page errors it reports. Tests that need the update
   signing key (not in the repository) are skipped when it isn't there. */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..');
const TESTS = [
  /* the Nova link */ 'read_first', 'hands_off', 'hello_choice', 'nova523_settings', 'boot_guard', 'connect_quiet', 'safety', 'tx_power',
  /* the page */ 'e2e_net', 'api', 'conn', 'e2e_blank', 'help_cart', 'osk_installed', 'status_row', 'pfl_pages', 'meters_noscroll', 'small_screen', 'test_panel',
  /* Stream Deck, the box */ 'deck_proto', 'deck_pi', 'pi_clock',
  /* packaging */ 'package_start',
  /* diagnostics, updates */ 'diag', 'updates', 'updates_device'];
const NEEDS_KEY = new Set(['updates', 'updates_device']);
const haveKey = !!process.env.NOVA_SIGNING_KEY || fs.existsSync(path.join(ROOT, 'signing', 'update-signing-key.pem'));
const pick = process.argv.slice(2), list = pick.length ? TESTS.filter(t => pick.includes(t)) : TESTS;
const bad = out => /^\s*(FAIL|SCROLLS)\b/m.test(out) || /(page )?errors:? \[[^\]\s]/.test(out) || /Error: (?!none)/.test(out.split('\n').slice(-3).join('\n'));
(async () => {
  const results = []; const t0 = Date.now();
  for (const t of list) {
    if (NEEDS_KEY.has(t) && !haveKey) { results.push([t, 'skipped (no signing key)', 0]); console.log(`-- ${t}: skipped (no signing key)`); continue; }
    const s = Date.now();
    const r = await new Promise(res => {
      const p = spawn(process.execPath, [path.join(DIR, t + '.js')], { cwd: ROOT, env: process.env });
      let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
      const timer = setTimeout(() => { out += '\nTIMED OUT after 10 minutes'; p.kill('SIGKILL'); }, 600000);
      p.on('exit', code => { clearTimeout(timer); res({ code, out }); });
    });
    const ok = r.code === 0 && !bad(r.out) && !/TIMED OUT/.test(r.out);
    const secs = Math.round((Date.now() - s) / 1000);
    results.push([t, ok ? 'passed' : 'FAILED', secs]);
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${t} (${secs} s)`);
    if (!ok) console.log(r.out.split('\n').slice(-40).map(l => '      ' + l).join('\n'));
  }
  const failed = results.filter(r => r[1] === 'FAILED');
  console.log(`\n${results.filter(r => r[1] === 'passed').length} passed, ${failed.length} failed, ${results.filter(r => /skipped/.test(r[1])).length} skipped in ${Math.round((Date.now() - t0) / 60000)} min`);
  if (failed.length) console.log('Failed: ' + failed.map(r => r[0]).join(', '));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `| Test | Result | Time |\n|---|---|---|\n${results.map(r => `| ${r[0]} | ${r[1]} | ${r[2]} s |`).join('\n')}\n`);
  process.exit(failed.length ? 1 : 0);
})();
