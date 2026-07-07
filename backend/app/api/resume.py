from fastapi import APIRouter, UploadFile, File
import os
import shutil

from app.services.pdf_parser import parse_pdf

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload_resume")
async def upload_resume(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    text = parse_pdf(file_path)
    return {
        "filename": file.filename,
        "text": text
    }
