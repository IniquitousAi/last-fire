"""One push of the ride-along mockup: bump the version everywhere at once and write the note the UPDATE READY pop-up shows.
    python next/bump.py "what changed, in his words"
Checks every client and core file as a module (the way the browser reads it) before writing anything."""
import json, pathlib, re, shutil, subprocess, sys, tempfile
HERE = pathlib.Path(__file__).resolve().parent
args = sys.argv[1:]; serves = ''; check = '--check' in args; args = [a for a in args if a != '--check']
if '--serves' in args: i = args.index('--serves'); serves = (args[i + 1] if i + 1 < len(args) else '').upper(); del args[i:i + 2]
# the spine (DESIGN.md): every new feature says which of B, C, A it serves before it ships (checklist item 3)
if not serves or any(c not in 'BCA' for c in serves.replace(',', '')): sys.exit('NOT SHIPPED: say which part of the spine this serves: --serves B (the curiosity machine), C (the hangout) or A (the scale), e.g. --serves C or --serves B,A')
note = ' '.join(args).strip() or 'Small fixes.'
if check: print(f'ok: serves {serves}: {note}'); sys.exit(0)
tmp = pathlib.Path(tempfile.mkdtemp())
for f in list((HERE / 'client').glob('*.js')) + list((HERE / 'core').glob('*.js')):
    shutil.copy(f, tmp / (f.stem + '.mjs'))
    r = subprocess.run(['node', '--check', str(tmp / (f.stem + '.mjs'))], capture_output=True, text=True)
    if r.returncode: sys.exit(f'NOT SHIPPED: {f.name} does not parse:\n{r.stderr[:600]}')
# a // comment swallows everything after it on its line, so code there silently never runs (it broke the game four times). Refuse it.
SWALLOWED = re.compile(r"//[^'`\n]*\)\s+(?:[A-Za-z_$][\w$.]*\s*(?:\(|=[^=>])|if \(|for \(|return\b|const |let )")
for f in list((HERE / 'client').glob('*.js')) + list((HERE / 'core').glob('*.js')):
    for i, line in enumerate(f.read_text(encoding='utf-8').splitlines(), 1):
        k = line.find('//')
        if k > 0 and 'http' not in line[max(0, k - 6):k + 2] and SWALLOWED.search(line[k:]):
            sys.exit(f'NOT SHIPPED: {f.name}:{i} has code after a // comment (it never runs):\n{line.strip()[:200]}')
main = HERE / 'client' / 'main.js'; s = main.read_text(encoding='utf-8')
old = int(re.search(r'const BUILD = (\d+);', s).group(1)); new = old + 1
s = s.replace(f'const BUILD = {old};', f'const BUILD = {new};')
s = re.sub(r"(\.js)\?v=\d+'", rf"\1?v={new}'", s); main.write_text(s, encoding='utf-8')
for f in (HERE / 'client').glob('*.js'):   # (every module's own imports carry the same version, so a reload never mixes old and new)
    if f.name != 'main.js': t = f.read_text(encoding='utf-8'); f.write_text(re.sub(r"(\.js)\?v=\d+'", rf"\1?v={new}'", t), encoding='utf-8')
idx = HERE / 'index.html'; idx.write_text(re.sub(r'main\.js\?v=\d+', f'main.js?v={new}', idx.read_text(encoding='utf-8')), encoding='utf-8')
(HERE / 'version.json').write_text(json.dumps({'v': new, 'notes': note, 'serves': serves}), encoding='utf-8')
with open(HERE / 'SPINE-LOG.md', 'a', encoding='utf-8') as f: f.write(f'- v{new} serves {serves}: {note}' + chr(10))
print(f'version {old} -> {new}: {note}')
