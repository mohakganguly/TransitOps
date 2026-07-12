from fastapi import FastAPI

from chat_assistant.backend.app.api.assistant import router as assistant_router

app = FastAPI(
    title="TransitOps AI Assistant",
    version="1.0.0"
)

app.include_router(
    assistant_router,
    prefix="/api/v1/assistant",
    tags=["Assistant"],
)


@app.get("/")
def root():
    return {
        "status": "running",
        "service": "TransitOps AI Assistant"
    }