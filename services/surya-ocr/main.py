import asyncio
import html.parser
import io
import logging
import os
import secrets
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image, UnidentifiedImageError

MAX_IMAGE_BYTES = 4 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG"}
ocr_lock = asyncio.Lock()
recognition_predictor: Any = None
logger = logging.getLogger("hackmate.surya")


class TextContentParser(html.parser.HTMLParser):
    block_tags = {
        "br",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "p",
        "td",
        "th",
        "tr",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self.block_tags:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.block_tags:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def get_field(value: Any, name: str, default: Any = None) -> Any:
    if isinstance(value, dict):
        return value.get(name, default)
    return getattr(value, name, default)


def to_float(value: Any) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if 0 <= parsed <= 1 else None


def to_bbox(value: Any) -> list[float] | None:
    try:
        values = [float(item) for item in value]
    except (TypeError, ValueError):
        return None
    return values if len(values) == 4 else None


def recognize(image: Image.Image) -> dict[str, Any]:
    predictions = recognition_predictor([image])
    if not predictions:
        return {"blocks": [], "confidence": 0.0}

    page = predictions[0]
    result_blocks: list[dict[str, Any]] = []
    confidences: list[float] = []
    for block in get_field(page, "blocks", []) or []:
        parser = TextContentParser()
        parser.feed(str(get_field(block, "html", "") or ""))
        confidence = to_float(get_field(block, "confidence"))
        text = "\n".join(
            " ".join(line.split())
            for line in "".join(parser.parts).splitlines()
            if line.strip()
        )
        if confidence is not None and text:
            confidences.append(confidence)
        reading_order = get_field(block, "reading_order")
        try:
            reading_order = int(reading_order) if reading_order is not None else None
        except (TypeError, ValueError):
            reading_order = None
        result_blocks.append(
            {
                "text": text,
                "label": get_field(block, "label"),
                "confidence": confidence,
                "readingOrder": reading_order,
                "bbox": to_bbox(get_field(block, "bbox")),
                "skipped": bool(get_field(block, "skipped", False)),
                "error": bool(get_field(block, "error", False)),
            }
        )

    result_blocks.sort(
        key=lambda item: (
            item["readingOrder"] is None,
            item["readingOrder"] if item["readingOrder"] is not None else 0,
        )
    )
    confidence = sum(confidences) / len(confidences) if confidences else 0.0
    return {"blocks": result_blocks, "confidence": confidence}


@asynccontextmanager
async def lifespan(_: FastAPI):
    global recognition_predictor
    from surya.inference import SuryaInferenceManager
    from surya.recognition import RecognitionPredictor

    manager = SuryaInferenceManager()
    recognition_predictor = RecognitionPredictor(manager)
    yield
    recognition_predictor = None


app = FastAPI(
    title="HackMate Surya OCR",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


@app.get("/healthz")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ocr")
async def ocr(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    expected_token = os.environ.get("SURYA_SERVICE_TOKEN", "")
    supplied_token = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not expected_token or not secrets.compare_digest(supplied_token, expected_token):
        raise HTTPException(status_code=401, detail="Unauthorized")

    contents = await file.read(MAX_IMAGE_BYTES + 1)
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large")

    try:
        with Image.open(io.BytesIO(contents)) as source:
            if source.format not in ALLOWED_FORMATS:
                raise HTTPException(status_code=415, detail="Unsupported image type")
            image = source.convert("RGB")
    except UnidentifiedImageError as error:
        raise HTTPException(status_code=422, detail="Invalid image") from error

    if recognition_predictor is None:
        raise HTTPException(status_code=503, detail="OCR service is starting")

    async with ocr_lock:
        try:
            return await run_in_threadpool(recognize, image)
        except Exception as error:
            logger.error("Surya OCR failed (%s).", type(error).__name__)
            raise HTTPException(status_code=503, detail="OCR processing failed") from error
