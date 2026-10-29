import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Modal } from "./Modal";

const VIEWPORT_SIZE = 360;
const OUTPUT_SIZE = 1000;
const MAX_ZOOM = 3;

interface Props {
  file: File;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
}

/** Квадратный кроп фото перед загрузкой — товар на карточке и в карточке товара всегда
 *  показывается в квадрате (object-fit: cover), и без этого шага браузер сам обрезает
 *  неквадратное фото по центру, что часто отрезает важную часть кадра. Логика идентична
 *  "cover": на zoom=1 картинка ровно покрывает видимую область без зазоров, слайдер
 *  зумирует дальше, перетаскивание двигает картинку в рамках допустимых границ. */
export function ImageCropModal({ file, onConfirm, onCancel }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function baseScale(w: number, h: number): number {
    return VIEWPORT_SIZE / Math.min(w, h);
  }

  function clampOffset(x: number, y: number, scale: number, w: number, h: number) {
    const dispW = w * scale;
    const dispH = h * scale;
    return {
      x: Math.min(0, Math.max(VIEWPORT_SIZE - dispW, x)),
      y: Math.min(0, Math.max(VIEWPORT_SIZE - dispH, y)),
    };
  }

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalSize({ w, h });
    const scale = baseScale(w, h);
    // Центрируем картинку в рамке по умолчанию.
    setOffset({ x: (VIEWPORT_SIZE - w * scale) / 2, y: (VIEWPORT_SIZE - h * scale) / 2 });
    setZoom(1);
  }

  function handleZoomChange(nextZoom: number) {
    if (!naturalSize) return;
    const scale = baseScale(naturalSize.w, naturalSize.h) * nextZoom;
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, scale, naturalSize.w, naturalSize.h));
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState.current || !naturalSize) return;
    const scale = baseScale(naturalSize.w, naturalSize.h) * zoom;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const next = clampOffset(
      dragState.current.origX + dx,
      dragState.current.origY + dy,
      scale,
      naturalSize.w,
      naturalSize.h,
    );
    setOffset(next);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragState.current = null;
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !naturalSize) return;
    const scale = baseScale(naturalSize.w, naturalSize.h) * zoom;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sourceX = -offset.x / scale;
    const sourceY = -offset.y / scale;
    const sourceSize = VIEWPORT_SIZE / scale;
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        onConfirm(new File([blob], croppedName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <Modal title="Обрежьте фото под квадрат" onClose={onCancel}>
      <p className="form-hint" style={{ marginTop: 0 }}>
        Перетащите фото, чтобы выбрать видимую область — так оно будет показано на карточке товара.
      </p>

      <div
        className="image-crop__viewport"
        style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {imageUrl && (
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            onLoad={handleImageLoad}
            draggable={false}
            style={
              naturalSize
                ? {
                    position: "absolute",
                    left: offset.x,
                    top: offset.y,
                    width: naturalSize.w * baseScale(naturalSize.w, naturalSize.h) * zoom,
                    height: naturalSize.h * baseScale(naturalSize.w, naturalSize.h) * zoom,
                    maxWidth: "none",
                  }
                : { opacity: 0 }
            }
          />
        )}
      </div>

      <label className="form-field" style={{ marginTop: 16 }}>
        Масштаб
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          disabled={!naturalSize}
        />
      </label>

      <div className="modal__footer">
        <button type="button" className="btn btn--outline" onClick={onCancel}>
          Отмена
        </button>
        <button type="button" className="btn" onClick={handleConfirm} disabled={!naturalSize}>
          Обрезать и загрузить
        </button>
      </div>
    </Modal>
  );
}
