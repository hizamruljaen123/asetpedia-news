from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import json
import os
from pathlib import Path

app = FastAPI(title="Admin Dashboard API", version="1.0.0")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/api/news")
async def get_news():
    """Get all news data from the JSON file"""
    try:
        json_file_path = Path("static/formatted_combined.json")
        if not json_file_path.exists():
            raise HTTPException(status_code=404, detail="News data file not found")

        with open(json_file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)

        return {"data": data, "total": len(data)}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading news data: {str(e)}")

@app.get("/api/news/{item_id}")
async def get_news_item(item_id: int):
    """Get a specific news item by ID"""
    try:
        json_file_path = Path("static/formatted_combined.json")
        if not json_file_path.exists():
            raise HTTPException(status_code=404, detail="News data file not found")

        with open(json_file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)

        if item_id < 0 or item_id >= len(data):
            raise HTTPException(status_code=404, detail="News item not found")

        return data[item_id]
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading news data: {str(e)}")

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """Serve the dashboard HTML page"""
    try:
        template_path = Path("templates/dashboard.html")
        if not template_path.exists():
            return HTMLResponse("<h1>Dashboard template not found</h1>", status_code=404)

        with open(template_path, 'r', encoding='utf-8') as file:
            content = file.read()

        return HTMLResponse(content)
    except Exception as e:
        return HTMLResponse(f"<h1>Error loading dashboard: {str(e)}</h1>", status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
