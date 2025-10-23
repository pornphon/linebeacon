import express from 'express';
import * as line from '@line/bot-sdk';
import * as dotenv from 'dotenv';
dotenv.config();

// 1. ตั้งค่า Config
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN, // ดึงค่าจาก .env
    channelSecret: process.env.CHANNEL_SECRET          // ดึงค่าจาก .env
};

// 2. สร้าง Client และ Express App
const client = new line.Client(config);
const app = express();

// 3. สร้าง Route สำหรับ Webhook
// ต้องใช้ middleware ของ line-bot-sdk เพื่อตรวจสอบลายเซ็น (Signature)
app.post('/webhook', line.middleware(config), (req, res) => {

  // ตรวจสอบว่ามี events ใน body หรือไม่
  if (!req.body || !req.body.events) {
    return res.status(200).send('OK');
  }

  // วนลูปจัดการทุก Event ที่ LINE ส่งมา (อาจจะส่งมาหลายอันพร้อมกัน)
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result)) // ส่ง 200 OK กลับไป
    .catch((err) => {
      console.error(err);
      res.status(500).end(); // ถ้า Error ให้ส่ง 500
    });
});

// 4. ฟังก์ชันหลัก: แยกประเภท Event
async function handleEvent(event) {
  
  // -----------------------------------------------------------------
  // ----- นี่คือส่วนที่สำคัญที่สุดสำหรับ Beacon (ตามบทความ) -----
  // -----------------------------------------------------------------
  if (event.type === 'beacon') {
    const hwid = event.beacon.hwid;
    const beaconType = event.beacon.type; // 'enter', 'leave', หรือ 'banner'

    console.log(`[Beacon Event] HWID: ${hwid}, Type: ${beaconType}`);
    
    let replyText = `ตรวจพบ Beacon! (HWID: ${hwid}, Type: ${beaconType})`;

    // สร้างข้อความตอบกลับตามประเภทของ Beacon
    if (beaconType === 'enter') {
      replyText = 'สวัสดี! ยินดีต้อนรับเข้าสู่พื้นที่ของเรา 🚀';
    } else if (beaconType === 'leave') {
      replyText = 'แล้วพบกันใหม่นะ 👋';
    }

    // สั่งให้ Bot ตอบกลับ
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText
    });
  }
  // -----------------------------------------------------------------

  // (ควรมี) ดัก Event ประเภทอื่นด้วย เช่น ข้อความ
  if (event.type === 'message' && event.message.type === 'text') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'คุณส่งข้อความมา' // ตอบกลับข้อความปกติ
    });
  }

  // ถ้าเป็น Event ประเภทอื่นที่เราไม่สนใจ ก็ไม่ต้องทำอะไร
  return Promise.resolve(null);
}

// 5. สั่งรัน Server
const port = process.env.PORT || 4713;
app.listen(port, () => {
  console.log(`Webhook server กำลังรันที่ http://localhost:${port}`);
});