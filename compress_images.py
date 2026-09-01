import os
from PIL import Image

DIST = r"D:\社区任务\dist"
MAX_EDGE = 1600
JPEG_QUALITY = 82

def human(n):
    return f"{n / 1024 / 1024:.2f}MB" if n >= 1024 * 1024 else f"{n / 1024:.0f}KB"

def process(path):
    orig = os.path.getsize(path)
    ext = os.path.splitext(path)[1].lower()
    tmp = path + ".tmp"
    with Image.open(path) as im:
        w, h = im.size
        if max(w, h) > MAX_EDGE:
            ratio = MAX_EDGE / max(w, h)
            im = im.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)
        if ext in (".jpg", ".jpeg"):
            im.convert("RGB").save(tmp, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        elif ext == ".png":
            im.save(tmp, "PNG", optimize=True, compress_level=9)
        else:
            return None
    new = os.path.getsize(tmp)
    os.replace(tmp, path)
    return orig, new

total_b = total_a = 0
print(f"{'文件':<46}{'原尺寸':>12}{'新尺寸':>10}{'压缩前':>10}{'压缩后':>10}{'节省':>8}")
print("-" * 100)
for fname in sorted(os.listdir(DIST)):
    if fname == "index.html":
        continue
    full = os.path.join(DIST, fname)
    if not os.path.isfile(full):
        continue
    res = process(full)
    if res is None:
        continue
    b, a = res
    total_b += b
    total_a += a
    with Image.open(full) as im:
        w, h = im.size
    pct = f"{(1 - a / b) * 100:.0f}%"
    print(f"{fname:<46}{'':>4}{'':>8}{human(b):>10}{human(a):>10}{pct:>8}  ({w}x{h})")

print("-" * 100)
print(f"合计: {human(total_b)} -> {human(total_a)}  节省 {(1 - total_a / total_b) * 100:.0f}%")
