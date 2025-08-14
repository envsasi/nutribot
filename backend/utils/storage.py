import os, uuid, hashlib, time, pathlib
from fastapi import UploadFile

# Allowed file types (extend later if needed)
ALLOW_MIME = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
}

def ensure_dir(path: str):
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)

def sha256sum_file(path: str, chunk_size: int = 8192) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(chunk_size), b""):
            h.update(chunk)
    return h.hexdigest()

async def save_file(upload: UploadFile, upload_dir: str, max_bytes: int) -> dict:
    # Validate MIME type by header (basic check; add magic sniff later if needed)
    ext = ALLOW_MIME.get(upload.content_type)
    if not ext:
        raise ValueError(f"Unsupported content_type: {upload.content_type}. Allowed: {', '.join(ALLOW_MIME.keys())}")

    ensure_dir(upload_dir)

    file_id = str(uuid.uuid4())
    stored_filename = f"{file_id}{ext}"
    dest_path = os.path.join(upload_dir, stored_filename)

    # Stream to disk in chunks and enforce a size limit
    size = 0
    with open(dest_path, "wb") as out:
        while True:
            chunk = await upload.read(1024 * 1024)  # 1 MiB
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                out.close()
                try:
                    os.remove(dest_path)
                except OSError:
                    pass
                raise ValueError(f"File too large (> {max_bytes} bytes)")
            out.write(chunk)

    await upload.close()

    sha256 = sha256sum_file(dest_path)
    meta = {
        "file_id": file_id,
        "stored_filename": stored_filename,
        "original_filename": upload.filename,
        "mime": upload.content_type,
        "size_bytes": size,
        "sha256": sha256,
        "uploaded_at": int(time.time()),
    }

    # Write a sidecar JSON with metadata (handy for quick lookups)
    import json
    with open(dest_path + ".json", "w", encoding="utf-8") as m:
        json.dump(meta, m, ensure_ascii=False)

    return meta
