from fastapi import APIRouter, HTTPException

from chat_assistant.backend.app.schemas.assistant import (
    ChatRequest,
    ChatResponse,
)

from chat_assistant.backend.app.services.assistant import (
    FleetAssistant,
)

router = APIRouter()

assistant = FleetAssistant()


@router.post(
    "/chat",
    response_model=ChatResponse,
)
def chat(request: ChatRequest):

    try:

        answer = assistant.chat(request.question)

        return ChatResponse(
            success=True,
            answer=answer,
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )