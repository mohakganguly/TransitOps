import os
import re
from openai import OpenAI
from chat_assistant.backend.app.config import (
    GROQ_API_KEY,
    MODEL_NAME,
)

class LLM:
    def __init__(self):
        self.is_mock = (GROQ_API_KEY == "mock-groq-key" or not GROQ_API_KEY)
        if not self.is_mock:
            try:
                self.client = OpenAI(
                    api_key=GROQ_API_KEY,
                    base_url="https://api.groq.com/openai/v1",
                )
                self.model = MODEL_NAME
            except Exception as e:
                print(f"Failed to initialize OpenAI client: {e}. Falling back to mock.")
                self.is_mock = True

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0,
    ) -> str:
        if self.is_mock:
            return self._mock_generate(system_prompt, user_prompt)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                temperature=temperature,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq API error: {e}. Falling back to mock generator.")
            return self._mock_generate(system_prompt, user_prompt)

    def _mock_generate(self, system_prompt: str, user_prompt: str) -> str:
        # Check if generating SQL or answering
        if "generator" in system_prompt.lower():
            return self._mock_sql(user_prompt)
        else:
            return self._mock_answer(user_prompt)


    def _mock_sql(self, question: str) -> str:
        q = question.lower()
        if "vehicle" in q or "fleet" in q:
            if "odometer" in q:
                if "highest" in q or "max" in q or "most" in q:
                    return "SELECT * FROM vehicles ORDER BY odometer DESC LIMIT 1;"
                return "SELECT reg_no, name, odometer FROM vehicles;"
            if "status" in q or "available" in q:
                return "SELECT * FROM vehicles WHERE status = 'Available';"
            if "maintenance" in q or "shop" in q:
                return "SELECT * FROM vehicles WHERE status = 'In Shop';"
            return "SELECT * FROM vehicles;"
        elif "driver" in q:
            if "score" in q or "safety" in q:
                return "SELECT * FROM drivers ORDER BY safety_score DESC;"
            if "available" in q:
                return "SELECT * FROM drivers WHERE status = 'Available';"
            return "SELECT * FROM drivers;"
        elif "trip" in q:
            if "active" in q or "dispatched" in q:
                return "SELECT * FROM trips WHERE status = 'Dispatched';"
            if "completed" in q:
                return "SELECT * FROM trips WHERE status = 'Completed';"
            return "SELECT * FROM trips;"
        elif "maintenance" in q or "shop" in q:
            return "SELECT * FROM maintenance_logs WHERE status = 'Open';"
        elif "expense" in q or "cost" in q:
            return "SELECT category, SUM(amount) AS total_amount FROM expenses GROUP BY category;"
        elif "fuel" in q:
            return "SELECT SUM(liters) AS total_liters, SUM(cost) AS total_cost FROM fuel_logs;"
        else:
            # Default to return top 5 vehicles
            return "SELECT * FROM vehicles LIMIT 5;"

    def _mock_answer(self, user_prompt: str) -> str:
        # Extract the question and SQL Results from user_prompt
        match = re.search(r"User Question:\s*(.*?)\s*SQL Results:\s*(.*?)(?:\n\nGenerate|\Z)", user_prompt, re.DOTALL | re.IGNORECASE)
        if not match:
            return f"Mock Response: I found some database entries. Here is the raw data:\n{user_prompt}"

        question = match.group(1).strip()
        results_str = match.group(2).strip()


        # Try to parse results as JSON
        try:
            import json
            results = json.loads(results_str)
        except Exception:
            return f"I ran the database query but found no formatted results:\n{results_str}"

        if not isinstance(results, list) or len(results) == 0:
            return "No matching records were found in the database."

        # Generate a nice natural answer based on parsed records
        q = question.lower()
        num_records = len(results)
        
        if "vehicle" in q or "fleet" in q:
            if "odometer" in q and ("highest" in q or "max" in q or "most" in q):
                v = results[0]
                return f"The vehicle with the highest odometer reading is **{v.get('name')}** (Reg: `{v.get('reg_no')}`) with **{v.get('odometer')} km**."
            elif "status" in q or "available" in q:
                names = [f"**{r.get('name')}** (`{r.get('reg_no')}`)" for r in results]
                return f"There are {num_records} available vehicles:\n" + "\n".join([f"- {n}" for n in names])
            else:
                lines = [f"- **{r.get('name')}** (Reg: `{r.get('reg_no')}`, Type: {r.get('type')}, Status: {r.get('status')})" for r in results]
                return f"Here is the list of vehicles ({num_records} total):\n" + "\n".join(lines)
                
        elif "driver" in q:
            if "score" in q or "safety" in q:
                lines = [f"- **{r.get('name')}** (License: `{r.get('license_no')}`, Safety Score: **{r.get('safety_score')}**)" for r in results]
                return f"Here are the drivers sorted by safety score:\n" + "\n".join(lines)
            elif "available" in q:
                names = [f"**{r.get('name')}** (`{r.get('license_no')}`)" for r in results]
                return f"There are {num_records} available drivers:\n" + "\n".join([f"- {n}" for n in names])
            else:
                lines = [f"- **{r.get('name')}** (License: `{r.get('license_no')}`, Category: {r.get('license_category')}, Status: {r.get('status')})" for r in results]
                return f"Here are the drivers ({num_records} total):\n" + "\n".join(lines)
                
        elif "trip" in q:
            lines = [f"- Trip #{r.get('id')}: **{r.get('source')}** to **{r.get('destination')}** (Status: *{r.get('status')}*, Revenue: ₹{r.get('revenue')})" for r in results]
            return f"Here are the trips matching your search:\n" + "\n".join(lines)
            
        elif "maintenance" in q:
            lines = [f"- Log #{r.get('id')}: Vehicle ID {r.get('vehicle_id')} - *{r.get('type')}* ({r.get('description')}), Cost: ₹{r.get('cost')}" for r in results]
            return f"Here are the open maintenance records:\n" + "\n".join(lines)
            
        elif "expense" in q or "cost" in q:
            lines = [f"- **{r.get('category')}**: ₹{r.get('total_amount'):,.2f}" for r in results if r.get('category')]
            return "Here is the breakdown of expenses by category:\n" + "\n".join(lines)
            
        elif "fuel" in q:
            r = results[0]
            liters = r.get('total_liters') or 0
            cost = r.get('total_cost') or 0
            return f"The total fuel logs report **{liters:.1f} liters** consumed for a total cost of **₹{cost:,.2f}**."

        return f"I executed the query and found {num_records} records. Here is the summary:\n" + json.dumps(results[:3], indent=2) + ("\n...(truncated)" if len(results) > 3 else "")