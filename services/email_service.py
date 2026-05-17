import aiosmtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

class EmailService:
    def __init__(self):
        self.sender = os.getenv("GMAIL_SENDER")
        self.password = os.getenv("GMAIL_APP_PASSWORD")

    async def send_meeting_link(self, lead_name: str, lead_email: str, calendly_link: str):
        """Sends Calendly meeting link to lead via Gmail."""
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your Free Discovery Call with Cyberify Academy"
        msg["From"] = f"Alex from Cyberify Academy <{self.sender}>"
        msg["To"] = lead_email

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hi {lead_name},</h2>
            <p>Thank you for speaking with me today! As promised, here is the link to book your 
            <strong>free 15-minute discovery call</strong> with our team at Cyberify Academy.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{calendly_link}" 
                   style="background-color: #2563eb; color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 6px; font-size: 16px;">
                    📅 Book Your Free Discovery Call
                </a>
            </div>
            
            <p>In this call, we'll discuss:</p>
            <ul>
                <li>Your cybersecurity career goals</li>
                <li>Which program fits your background</li>
                <li>How our students have successfully transitioned into tech</li>
            </ul>
            
            <p>Looking forward to connecting!</p>
            <p><strong>Alex</strong><br>Cyberify Academy Sales Team</p>
        </div>
        """

        msg.attach(MIMEText(html, "html"))

        try:
            await aiosmtplib.send(
                msg,
                hostname="smtp.gmail.com",
                port=465,
                username=self.sender,
                password=self.password,
                use_tls=True
            )
            print(f"✅ Email sent to {lead_email}")
        except Exception as e:
            print(f"❌ Email failed: {e}")

