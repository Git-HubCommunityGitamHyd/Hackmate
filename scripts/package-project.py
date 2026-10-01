#!/usr/bin/env python3
"""Package HackMate into downloadable archives.

Creates in /home/z/my-project/download/:
  - hackmate-source.zip      full source, runnable after `bun install` (see FRAMEWORK.md)
  - hackmate-screenshots.zip every page screenshot

Excluded from the source zip (recreated locally or secrets):
  node_modules, .next, .pgdata, scripts/pgbin (embedded PG binaries, 67MB),
  download/, .env, .env.local, dev.log, worklog.md, agent-ctx, .git
"""
import os
import zipfile

ROOT = "/home/z/my-project"
OUT = os.path.join(ROOT, "download")
SHOTS = os.path.join(ROOT, "download", "screenshots")

EXCLUDE_DIRS = {
    "node_modules", ".next", ".pgdata", "pgbin", "download", ".git",
    "agent-ctx", ".turbo", ".vercel", "certs", "skills",
}
# drizzle migrations ARE shipped (needed to create the schema); the exclusion
# above refers to nothing -- remove it to be safe:
EXCLUDE_DIRS.discard("drizzle")

EXCLUDE_FILES = {
    ".env", ".env.local", ".env.production", "dev.log", "worklog.md",
    ".DS_Store", "tsconfig.tsbuildinfo",
}
EXCLUDE_PREFIX = ("scripts/pgbin",)


def include(rel: str, is_dir: bool) -> bool:
    if is_dir:
        return os.path.basename(rel) not in EXCLUDE_DIRS
    if os.path.basename(rel) in EXCLUDE_FILES:
        return False
    if rel.startswith(EXCLUDE_PREFIX):
        return False
    return True


def add_tree(zf: zipfile.ZipFile, base: str, arc_root: str) -> int:
    n = 0
    for dirpath, dirnames, filenames in os.walk(base):
        rel_dir = os.path.relpath(dirpath, ROOT)
        dirnames[:] = [
            d for d in dirnames
            if include(os.path.normpath(os.path.join(rel_dir, d)), True)
            and d not in EXCLUDE_DIRS
        ]
        for fname in filenames:
            rel = os.path.normpath(os.path.join(rel_dir, fname))
            if not include(rel, False):
                continue
            full = os.path.join(dirpath, fname)
            arc = os.path.join(arc_root, rel)
            try:
                zf.write(full, arc)
            except ValueError:
                # some files carry pre-1980 mtimes; normalize the timestamp
                st = os.stat(full)
                zi = zipfile.ZipInfo(arc, date_time=(2024, 1, 1, 0, 0, 0))
                zi.compress_type = zipfile.ZIP_DEFLATED
                zi.external_attr = 0o644 << 16
                with open(full, "rb") as fh:
                    zf.writestr(zi, fh.read(), compress_type=zipfile.ZIP_DEFLATED)
            n += 1
    return n


def main() -> None:
    os.makedirs(OUT, exist_ok=True)

    src_zip = os.path.join(OUT, "hackmate-source.zip")
    with zipfile.ZipFile(src_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        count = add_tree(zf, ROOT, "hackmate")
    size = os.path.getsize(src_zip) / 1e6
    print(f"source zip: {src_zip} ({count} files, {size:.1f} MB)")

    shots_zip = os.path.join(OUT, "hackmate-screenshots.zip")
    with zipfile.ZipFile(shots_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        n = 0
        for fname in sorted(os.listdir(SHOTS)):
            if fname.endswith(".png"):
                zf.write(os.path.join(SHOTS, fname), os.path.join("screenshots", fname))
                n += 1
    size = os.path.getsize(shots_zip) / 1e6
    print(f"screenshots zip: {shots_zip} ({n} files, {size:.1f} MB)")


if __name__ == "__main__":
    main()
