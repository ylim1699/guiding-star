from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx, os, time

app = FastAPI()

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

DAILY_KEY = os.getenv("DAILY_API_KEY")

class RoomRequest(BaseModel):
    phone: str

@app.post("/create-room")
async def create_room(req: RoomRequest):
    name = "guidingStar-" + req.phone.replace("+", "").replace(" ", "")

    async with httpx.AsyncClient() as c:
        response = await c.post(
            "https://api.daily.co/v1/rooms",
            headers={"Authorization": f"Bearer {DAILY_KEY}"},
            json={
                "name": name,
                "properties": {
                    "enable_screenshare": True,
                    "start_video_off": True,
                    "enable_chat": False,
                    "exp": int(time.time()) + 7200
                }
            }
        )

        if response.status_code == 200:
            data = response.json()
        elif response.status_code == 400 and "already exists" in response.text:
            get_response = await c.get(
                f"https://api.daily.co/v1/rooms/{name}",
                headers={"Authorization": f"Bearer {DAILY_KEY}"}
            )
            if get_response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Daily.co error: {get_response.text}")
            data = get_response.json()
        else:
            raise HTTPException(status_code=502, detail=f"Daily.co error: {response.text}")

    url = data.get("url")
    if not url:
        raise HTTPException(status_code=502, detail="Daily.co did not return a room URL")
    return {"room_url": url, "room_name": name}

@app.get("/health")
async def health():
    return {"ok": True}
