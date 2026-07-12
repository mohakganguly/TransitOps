import urllib.request
import urllib.parse
import json
import sys

def make_post_request(url, data_dict, token=None):
    data = json.dumps(data_dict).encode('utf-8')
    headers = {
        'Content-Type': 'application/json'
    }
    if token:
        headers['Authorization'] = f'Bearer {token}'
        
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            return json.loads(res_body), response.status
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        try:
            return json.loads(res_body), e.code
        except Exception:
            return {"error": res_body}, e.code
    except Exception as e:
        return {"error": str(e)}, 500

def run_integration_tests():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

    print("=" * 60)
    print("Running Full-Stack Chat Assistant Integration Tests")
    print("=" * 60)

    # Step 1: Log in via Express Backend on port 4000
    login_url = "http://localhost:4000/api/auth/login"
    login_data = {
        "email": "manager@transitops.com",
        "password": "demo1234"
    }
    print(f"\nStep 1: Attempting login to Express API at: {login_url}")
    login_res, status = make_post_request(login_url, login_data)
    
    if status != 200 or "token" not in login_res:
        print(f"❌ LOGIN FAILED (Status {status}): {login_res}")
        print("Please make sure Express server is running on http://localhost:4000")
        sys.exit(1)
        
    token = login_res["token"]
    print("✅ Login Successful! Token retrieved.")

    # Step 2: Test Chatbot proxy endpoint with "Show available vehicles"
    chat_url = "http://localhost:4000/api/assistant/chat"
    test_q1 = "Show available vehicles"
    print(f"\nStep 2: Sending query '{test_q1}' to proxy endpoint: {chat_url}")
    
    chat_res, status = make_post_request(chat_url, {"question": test_q1}, token=token)
    
    if status != 200 or not chat_res.get("success"):
        print(f"❌ CHAT PROXY FAILED (Status {status}): {chat_res}")
        print("Please make sure FastAPI server is running on http://localhost:8000")
        sys.exit(1)
        
    answer = chat_res.get("answer", "")
    print("✅ Chat Proxy query responded successfully!")
    print(f"Assistant Answer:\n---\n{answer}\n---")
    
    if "Van-01" not in answer and "Truck-01" not in answer:
        print("❌ FAILED: Response does not contain expected available vehicles data.")
        sys.exit(1)
    else:
        print("✅ PASS: Available vehicles found in response.")

    # Step 3: Test Chatbot proxy endpoint with "Show driver safety scores"
    test_q2 = "Show driver safety scores"
    print(f"\nStep 3: Sending query '{test_q2}' to: {chat_url}")
    
    chat_res, status = make_post_request(chat_url, {"question": test_q2}, token=token)
    
    if status != 200 or not chat_res.get("success"):
        print(f"❌ CHAT PROXY FAILED (Status {status}): {chat_res}")
        sys.exit(1)
        
    answer = chat_res.get("answer", "")
    print("✅ Chat Proxy query responded successfully!")
    print(f"Assistant Answer:\n---\n{answer}\n---")
    
    if "Chirag Patel" not in answer and "Alex Kumar" not in answer:
        print("❌ FAILED: Response does not contain driver safety scores data.")
        sys.exit(1)
    else:
        print("✅ PASS: Driver safety scores found in response.")

    print("\n" + "=" * 60)
    print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)
    sys.exit(0)

if __name__ == "__main__":
    run_integration_tests()
