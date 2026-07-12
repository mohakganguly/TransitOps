from chat_assistant.backend.app.api.assistant import FleetAssistant

assistant = FleetAssistant()

print("=" * 60)
print("TransitOps AI Assistant")
print("=" * 60)

while True:

    question = input("\nQuestion: ")

    if question.lower() == "exit":
        break

    try:

        sql = assistant.generate_sql(question)

        print("\nGenerated SQL:\n")
        print(sql)

    except Exception as e:

        print("\nError:")
        print(e)