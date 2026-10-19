"""python next/sim/lookmatch.py [shots...]: the game's look against his north star (checklist items 1 and 56).
His vision picture (ref/vision-2026-10-19.jpg) is the mix he asked for, made by him: Maze Runner's wall, Destiny's sky, Arcane's color on black.
For the reference and each game shot (the HUD's edges cropped off) it measures what the picture is made of, as shares of the frame:
black, fog (cold low-saturation gray), red glow, violet glow, blue, green, and the banned warm (orange, gold, brown). The gap is the sum of
the differences; the biggest single difference is the next thing to fix. Writes playtests/look/side-<name>.png (the reference beside the
shot, numbers under each) and appends the round to playtests/look/rounds.md. Exit 1 if a banned color shows or no shot was measured."""
import sys, pathlib, colorsys, datetime
import numpy as np
from PIL import Image, ImageDraw
HERE = pathlib.Path(__file__).resolve().parent.parent
REF = HERE / 'ref' / 'vision-2026-10-19.jpg'
OUT = HERE / 'playtests' / 'look'; OUT.mkdir(parents=True, exist_ok=True)
KEYS = ['black', 'fog', 'red', 'violet', 'blue', 'green', 'warm']

def parts(img, crop=True):
    im = img.convert('RGB')
    if crop:   # (the HUD lives on the edges: judge the world, not the frame)
        w, h = im.size; im = im.crop((int(w * .08), int(h * .1), int(w * .92), int(h * .8)))
    im = im.resize((320, int(320 * im.size[1] / im.size[0])))
    a = np.asarray(im).astype(np.float32) / 255.0; r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); v = mx; s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hue = np.zeros_like(v); d = np.maximum(mx - mn, 1e-6)
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    lit = (s > 0.45) & (v > 0.3)
    m = {'black': (v < 0.12).mean(), 'fog': ((s < 0.2) & (v >= 0.18) & (v < 0.7)).mean(),
         'red': (lit & ((hue < 12) | (hue >= 335))).mean(), 'violet': (lit & (hue >= 255) & (hue < 335)).mean(),
         'blue': (lit & (hue >= 190) & (hue < 255)).mean(), 'green': (lit & (hue >= 75) & (hue < 165)).mean(),
         'warm': ((s > 0.4) & (v > 0.22) & (hue >= 15) & (hue < 60)).mean()}
    return {k: float(m[k]) for k in KEYS}

def side(name, ref_img, shot_img, R, S):
    H = 420; a = ref_img.convert('RGB'); a = a.resize((int(a.size[0] * H / a.size[1]), H)); b = shot_img.convert('RGB'); b = b.resize((int(b.size[0] * H / b.size[1]), H))
    W = a.size[0] + b.size[0] + 12; c = Image.new('RGB', (W, H + 70), (6, 6, 10)); c.paste(a, (0, 0)); c.paste(b, (a.size[0] + 12, 0)); d = ImageDraw.Draw(c)
    d.text((8, H + 8), 'HIS NORTH STAR  ' + '  '.join(f'{k} {R[k]*100:.0f}%' for k in KEYS), fill=(235, 235, 245))
    d.text((a.size[0] + 20, H + 8), name.upper() + '  ' + '  '.join(f'{k} {S[k]*100:.0f}%' for k in KEYS), fill=(235, 235, 245))
    gap = {k: S[k] - R[k] for k in KEYS}; big = max(KEYS, key=lambda k: abs(gap[k]))
    d.text((8, H + 36), f'gap {sum(abs(x) for x in gap.values()):.2f}   biggest: {big} {"+" if gap[big] > 0 else ""}{gap[big]*100:.0f} points', fill=(255, 80, 120))
    c.save(OUT / f'side-{name}.png'); return gap, big

def main():
    shots = [pathlib.Path(p) for p in sys.argv[1:]] or sorted((HERE / 'playtests' / 'rift').glob('*-3.png'))
    ref_img = Image.open(REF); R = parts(ref_img, crop=False); lines = []; worst = None; bad = False
    for p in shots:
        im = Image.open(p); S = parts(im); gap, big = side(p.stem, ref_img, im, R, S); tot = sum(abs(x) for x in gap.values())
        lines.append(f'| {p.stem} | {tot:.2f} | {big} {gap[big]*100:+.0f} | ' + ' | '.join(f'{S[k]*100:.1f}' for k in KEYS) + ' |')
        if S['warm'] > 0.005: bad = True
        if not worst or abs(gap[big]) > abs(worst[1]): worst = (big, gap[big], p.stem)
    head = f"\n## {datetime.datetime.now():%Y-%m-%d %H:%M}\nreference: " + ', '.join(f'{k} {R[k]*100:.1f}%' for k in KEYS) + '\n\n| shot | gap | biggest | ' + ' | '.join(KEYS) + ' |\n|' + '---|' * (3 + len(KEYS)) + '\n'
    body = head + '\n'.join(lines) + (f'\n\nfix next: {worst[0]} ({worst[1]*100:+.0f} points, worst in {worst[2]})\n' if worst else '\n')
    with open(OUT / 'rounds.md', 'a', encoding='utf-8') as f: f.write(body)
    print(body); print(('FAIL  a banned warm color shows' if bad else 'PASS  no banned warm color in any shot'))
    print(('PASS' if lines else 'FAIL') + f'  {len(lines)} shots measured against his north star')
    sys.exit(1 if bad or not lines else 0)

if __name__ == '__main__': main()
