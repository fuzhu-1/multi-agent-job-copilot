from fastapi import FastAPI
from app.api.resume import router as resume_router

app = FastAPI(
    title="Multi-Agent Job Copilot",
    version="0.1.0"
)

app.include_router(resume_router)

@app.get("/")
def root():
    return {
        "message": "Job Copilot API Running"
    }
