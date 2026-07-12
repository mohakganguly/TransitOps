import sys
from chat_assistant.backend.app.services.assistant import FleetAssistant

def run_tests():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print("=" * 60)

    print("Running Automated Tests for AI Fleet Assistant")
    print("=" * 60)
    
    assistant = FleetAssistant()
    
    test_questions = [
        "Show available vehicles",
        "Which vehicle has the highest odometer?",
        "Show driver safety scores",
        "List open maintenance logs"
    ]
    
    success = True
    for q in test_questions:
        print(f"\nTesting Question: '{q}'")
        try:
            answer = assistant.chat(q)
            print("Response:")
            print(answer)
            if not answer or "Error" in answer or "failed" in answer.lower():
                print("[FAIL]")
                success = False
            else:
                print("[PASS]")
        except Exception as e:
            print(f"[FAIL]: Raised exception: {e}")

            success = False
            
    print("\n" + "=" * 60)
    if success:
        print("All automated tests completed successfully!")
        sys.exit(0)
    else:
        print("Some automated tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
