from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx, os, time, resend
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DAILY_KEY = os.getenv("DAILY_API_KEY")
resend.api_key = os.getenv("RESEND_API_KEY")


class RoomRequest(BaseModel):
    phone: str


class SendInviteRequest(BaseModel):
    helper_email: str
    helper_name: str
    room_url: str
    senior_name: str


@app.post("/create-room")
async def create_room(req: RoomRequest):
    name = "boom-" + req.phone.replace("+", "").replace(" ", "")

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
                    "exp": int(time.time()) + 7200,
                },
            },
        )

        if response.status_code == 200:
            data = response.json()
        elif response.status_code == 400 and "already exists" in response.text:
            get_response = await c.get(
                f"https://api.daily.co/v1/rooms/{name}",
                headers={"Authorization": f"Bearer {DAILY_KEY}"},
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


@app.post("/send-invite")
async def send_invite(req: SendInviteRequest):
    resend.Emails.send({
        "from": "Boom Guide <onboarding@resend.dev>",
        "to": req.helper_email,
        "subject": f"{req.senior_name} needs your help",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 520px;
                    margin: 0 auto; padding: 32px;">
            <div style="background: #E85D04; border-radius: 12px;
                        padding: 24px; text-align: center; margin-bottom: 32px;">
                <h1 style="color: white; margin: 0; font-size: 28px;">
                    Boom Guide
                </h1>
            </div>
            <h2 style="color: #333; font-size: 24px;">
                {req.senior_name} needs your help
            </h2>
            <p style="color: #555; font-size: 18px; line-height: 1.6;">
                {req.senior_name} is asking for your guidance.
                Click the button below to join their screen sharing session.
                No download needed — it opens right in your browser.
            </p>
            <div style="text-align: center; margin: 40px 0;">
                <a href="{req.room_url}"
                   style="background: #E85D04; color: white;
                          padding: 20px 48px; border-radius: 12px;
                          font-size: 20px; font-weight: bold;
                          text-decoration: none; display: inline-block;">
                    Join Session
                </a>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center;">
                This link expires in 2 hours. Once you join,
                you can guide {req.senior_name} by clicking
                anywhere on their screen to place a pointer.
            </p>
        </div>
        """,
    })
    return {"sent": True}


@app.get("/health")
async def health():
    return {"ok": True}
