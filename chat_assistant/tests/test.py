from chat_assistant.backend.app.services.assistant import FleetAssistant

assistant = FleetAssistant()

print("=" * 60)
print("TransitOps AI Assistant Test Client")
print("=" * 60)

while True:
    try:
        question = input("\nQuestion (type 'exit' to quit): ")
        if question.lower() == 'exit':
            break

        if not question.strip():
            continue

        answer = assistant.chat(question)
        print("\nAnswer:\n")
        print(answer)

    except KeyboardInterrupt:
        break
    except Exception as e:
        print("\nError:")
        print(e)