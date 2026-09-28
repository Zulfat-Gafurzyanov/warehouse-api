import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from src.api.deps import get_current_admin
from src.core.config import settings

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)

# content-type -> расширение файла на диске.
_ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.post("/uploads/images", status_code=status.HTTP_201_CREATED)
async def upload_images(
    request: Request,
    files: list[UploadFile] = File(...),
) -> list[str]:
    """Сохраняет фото на диск сервера и возвращает их публичные URL — те же строки,
    что раньше вставлялись вручную в поле «Ссылки на фото»."""
    max_bytes = settings.UPLOAD_MAX_SIZE_MB * 1024 * 1024
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    urls: list[str] = []
    for file in files:
        ext = _ALLOWED_TYPES.get(file.content_type or "")
        if not ext:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Файл «{file.filename}»: поддерживаются только JPG, PNG и WEBP",
            )

        data = await file.read()
        if len(data) > max_bytes:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Файл «{file.filename}» больше {settings.UPLOAD_MAX_SIZE_MB} МБ",
            )

        filename = f"{uuid.uuid4().hex}{ext}"
        (upload_dir / filename).write_bytes(data)
        urls.append(f"{request.base_url}uploads/{filename}")

    return urls
