# NutriBot 🌱 (MVP)

A personalized food recommendation engine designed to provide educational insights based on user-inputted health conditions, symptoms, and dietary preferences.



---

## Key Features

-   **Personalized Suggestions:** Get food recommendations tailored to your specific needs.
-   **Multi-Factor Input:** Input health conditions (e.g., "Hypertension"), symptoms ("Bloating"), and preferences ("Vegetarian").
-   **Hybrid Intelligence:** Combines a reliable, rule-based system (from `foods.json`) with the flexibility of a Large Language Model (LLM) for more nuanced responses.
-   **Clear & Simple UI:** An easy-to-use interface built with React for a smooth user experience.

---

## Tech Stack

-   **Frontend:** React (Vite)
-   **Backend:** FastAPI (Python)
-   **Core Logic:** Hybrid model combining a rule-based engine and LLM integration.

---

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### **Prerequisites**

-   Node.js (v18 or newer)
-   Python (v3.9 or newer) & pip

### **Backend Setup**

```bash
# 1. Navigate to the backend directory
# (Assuming your backend code is in a folder named 'backend')
cd backend/

# 2. Install the required Python packages
pip install -r requirements.txt

# 3. Run the FastAPI development server
uvicorn main:app --reload



//Frontend Setup

# 1. In a new terminal, navigate to the frontend directory
# (Assuming your frontend code is in a folder named 'frontend')
cd frontend/

# 2. Install the required npm packages
npm install

# 3. Run the Vite development server
npm run dev



Project Team
[K.Sasi kiran] - Project Lead
[Reddy Babu] - Contributor
[pardhasaradhi] - Contributor
[Nagesh] - Contributor


