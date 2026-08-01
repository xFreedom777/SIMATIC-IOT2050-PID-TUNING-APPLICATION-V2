const fs = require('fs');

const descriptions = [
    "หน้าต่างกราฟแนวโน้ม (Trend Dashboard): แสดงผลการทำงานของระบบแบบ Real-time โดยแสดงความสัมพันธ์ระหว่างค่า Setpoint (SP), Process Value (PV) และ Output (%) ช่วยให้วิศวกรสามารถวิเคราะห์เสถียรภาพของระบบและการตอบสนองของวาล์วได้อย่างแม่นยำ",
    "หน้าต่างตั้งค่าพารามิเตอร์ (Parameter Configuration): หน้าจอสำหรับผู้ดูแลระบบในการปรับจูนค่า Proportional Gain (Kp), Integral Time (Ti), และ Derivative Time (Td) รวมถึงการตั้งขีดจำกัด (Limits) สำหรับ Input และ Output ของระบบ PID",
    "หน้าต่างจำลองการทำงาน (Simulation Mode): ฟังก์ชันสำหรับทดสอบการตอบสนองของระบบ (Step Test) โดยจำลองกระบวนการทางคณิตศาสตร์ (FOPDT) ก่อนนำค่าพารามิเตอร์ไปใช้งานจริงกับกระบวนการผลิต ป้องกันความเสียหายที่อาจเกิดขึ้น",
    "หน้าต่างแผงควบคุมหลัก (Main Dashboard): ศูนย์กลางการแสดงสถานะของ PID Loop ประกอบด้วยตัวเลขขนาดใหญ่สำหรับสังเกตการณ์ค่า SP, PV และ Output พร้อมปุ่มควบคุมโหมดการทำงานของวาล์ว (Auto/Manual/Inactive)",
    "หน้าต่างบันทึกข้อมูล (Data Logging): ส่วนจัดการระบบประวัติการทำงานและเก็บข้อมูลย้อนหลัง (Historical Data) รองรับการดึงข้อมูลออกมาในรูปแบบไฟล์ CSV และ PDF เพื่อนำไปทำรายงานสรุป",
    "การเพิ่มลูปควบคุม (Add PID Loop): ขั้นตอนการสร้างหรือเพิ่ม PID Loop ใหม่เข้าสู่ระบบ โดยผู้ใช้ต้องระบุชื่อลูป (Loop Name) และหมายเลข Data Block (Instance DB Number) ให้ตรงกับที่เขียนไว้ใน PLC",
    "การเลือกโหมดการควบคุม (Control Mode Selection): ขั้นตอนการสลับโหมดการทำงานของวาล์ว ประกอบด้วย โหมดอัตโนมัติ (Auto), โหมดควบคุมด้วยมือ (Manual) และโหมดหยุดการทำงาน (Inactive)",
    "การเชื่อมต่อระบบ (System Connection): ขั้นตอนการระบุหมายเลข IP Address ของ PLC S7-1200 พร้อมทั้งหมายเลข Rack และ Slot เพื่อสร้างช่องทางการสื่อสาร (S7 Communication) ระหว่าง HMI และอุปกรณ์คอนโทรลเลอร์",
    "สถานะของ PID Loop (Loop Status Indicators): การแสดงสถานะการทำงานปัจจุบันของแต่ละวงจรควบคุมด้วยสี ได้แก่ สีเขียว (Auto Mode), สีแดง (Manual Mode) และ สีเทา (Inactive Mode) เพื่อให้สังเกตได้ง่ายจากระยะไกล",
    "การตั้งค่าเป้าหมายเร่งด่วน (Quick Setpoint): ฟังก์ชันสำหรับผู้ใช้งาน (Operator) ในการป้อนค่าเป้าหมาย (Setpoint) ที่ต้องการควบคุมอย่างรวดเร็ว โดยระบบจะส่งค่าไปยัง PLC ทันทีเมื่อกดปุ่ม Set",
    "การตั้งค่าวันและเวลา (System Time Configuration): หน้าต่างสำหรับซิงโครไนซ์วันและเวลา (Date/Time) ของบอร์ด IOT2050 ให้ตรงกับเวลามาตรฐาน เพื่อความถูกต้องในการประทับเวลา (Timestamp) ของข้อมูลในไฟล์รายงาน",
    "แถบเมนูจัดการระบบ (System Management Bar): แถบคำสั่งระดับผู้ดูแลระบบ ประกอบด้วยปุ่มสำหรับตั้งค่า Data Block Offsets, ลบข้อมูลประวัติ (Clear History), ล็อคหน้าจอ (Lock), รีสตาร์ทระบบ (Restart) และปิดเครื่อง (Power Off)",
    "การกำหนดตำแหน่งหน่วยความจำ (Data Block Offsets): หน้าจอระดับวิศวกรรมสำหรับจับคู่ตำแหน่ง Address (Byte Offset) ของตัวแปรต่างๆ ระหว่างระบบ HMI และตัวแปรใน Data Block ของ TIA Portal",
    "ระบบรักษาความปลอดภัย (Security PIN Unlock): หน้าต่างยืนยันตัวตนด้วยรหัสผ่าน 4 หลัก (PIN) ป้องกันมิให้ผู้ที่ไม่มีส่วนเกี่ยวข้องเข้ามาแก้ไขพารามิเตอร์สำคัญของระบบหรือเปลี่ยนแปลงการตั้งค่า Data Block",
    "การอ่านและบันทึกพารามิเตอร์ (Read/Write Parameters): ปุ่มคำสั่งสำหรับดึงค่าพารามิเตอร์ล่าสุดจาก PLC (Read from PLC) หรือเขียนค่าที่ปรับจูนใหม่ลงสู่ PLC (Write to PLC) ผ่านโปรโตคอลการสื่อสาร",
    "การแจ้งเตือนข้อผิดพลาด (Alarm Notification): หน้าต่าง Pop-up แสดงข้อความแจ้งเตือนสีแดง (PID ALARM) ทันทีเมื่อระบบตรวจพบความผิดปกติ เช่น เซ็นเซอร์ขาด (Wire break) หรือค่าออกนอกเกณฑ์ (Out of limits)",
    "การรับทราบและรีเซ็ตข้อผิดพลาด (Error Acknowledge): เมื่อปัญหาหน้างานได้รับการแก้ไข ผู้ใช้งานต้องกดปุ่ม 'Reset Error' เพื่อล้างสถานะข้อผิดพลาดในระบบ PLC และให้ลูปควบคุมกลับมาทำงานตามปกติ",
    "ประวัติข้อผิดพลาด (Alarm History): ตารางเก็บบันทึกประวัติการเกิดข้อผิดพลาดทั้งหมดของระบบ พร้อมระบุวันเวลาและคำแนะนำในการแก้ไขเบื้องต้น หากต้องการล้างประวัติสามารถกดปุ่ม Clear Alarms ได้",
    "การจำลองสถานการณ์และการปรับจูน (Simulation Tuning): ส่วนการกำหนดค่าพารามิเตอร์สมมติในโหมด Simulation เพื่อจำลองพฤติกรรมทางพลศาสตร์ของวาล์ว (Dynamic Behavior) ว่าตอบสนองตามทฤษฎีหรือไม่",
    "ระบบคำนวณพารามิเตอร์อัตโนมัติ (Auto-Tune Calculator): ฟังก์ชันคำนวณค่า Kp, Ti, Td ทางคณิตศาสตร์จากโมเดล FOPDT แบบอัตโนมัติ ช่วยลดเวลาการลองผิดลองถูกของวิศวกรในการปรับจูนระบบ",
    "การนำค่าคำนวณไปใช้งาน (Apply Calculated Parameters): ผู้ใช้สามารถนำค่าพารามิเตอร์ที่ระบบคำนวณให้ (ตามวิธี Ziegler-Nichols หรือ Cohen-Coon) ไปใช้งานจริง โดยกดปุ่ม Apply ค่าเหล่านั้นจะถูกส่งไปยังหน้า Parameters ทันที",
    "ส่วนควบคุมการบันทึกข้อมูล (Data Logging Overview): หน้าต่างหลักสำหรับกำหนดค่าการจัดเก็บข้อมูล (Logging) ซึ่งครอบคลุมทั้งความถี่ในการบันทึก, การจัดการพื้นที่จัดเก็บ และการดาวน์โหลดข้อมูลดิบ",
    "การส่งออกข้อมูลดิบ (CSV Data Export): กระบวนการส่งออกประวัติการทำงานในรูปแบบไฟล์ Spreadsheet (.csv) เพื่อนำไปวิเคราะห์ชั้นสูงต่อในโปรแกรมเช่น Microsoft Excel",
    "โครงสร้างข้อมูลในไฟล์ CSV (CSV Data Structure): ตัวอย่างไฟล์ข้อมูลที่ถูกส่งออก ซึ่งประกอบด้วยคอลัมน์ Timestamp, Setpoint, Process Value, Output และสถานะ ErrorBits ครบถ้วนทุกๆ วินาที",
    "รายงานสรุปรูปแบบ PDF (PDF Summary Report): ระบบสามารถสร้างรายงานสรุปผลการทำงานอัตโนมัติในรูปแบบ PDF ประกอบด้วยตารางข้อมูล โลโก้โครงการ และกราฟสรุป สะดวกต่อการพิมพ์และนำเสนอ",
    "การจัดระเบียบไฟล์ข้อมูล (Directory Structure): การจัดเก็บไฟล์รายงานในระบบจะถูกแบ่งแยกออกเป็นโฟลเดอร์ตามชื่อของ PID Loop อย่างเป็นระเบียบ เพื่อความรวดเร็วในการค้นหาข้อมูลย้อนหลัง",
    "กระบวนการเริ่มต้นระบบใหม่ (System Reboot): หน้าจอแสดงสถานะเมื่อผู้ใช้กดปุ่ม Restart ระบบจะทำการเริ่มเซอร์วิสของแอปพลิเคชันใหม่ โดยกระบวนการนี้จะไม่กระทบต่อการทำงานของวาล์วที่ PLC ควบคุมอยู่",
    "กระบวนการปิดระบบอย่างปลอดภัย (System Shutdown): หน้าจอแสดงสถานะเมื่อผู้ใช้กดปุ่ม Power Off แนะนำให้ใช้ฟังก์ชันนี้เสมอเมื่อต้องการตัดไฟระบบ เพื่อป้องกันปัญหาไฟล์คอร์รัปต์หรือระบบปฏิบัติการเสียหาย",
    "การเปิดระบบอัตโนมัติ (Auto-Start on Boot): ภาพแสดงกระบวนการทำงานของเซอร์วิส (Systemd) ที่จะดึงระบบ HMI ขึ้นมาแสดงผลบนหน้าจออัตโนมัติ (Kiosk Mode) ทันทีที่จ่ายไฟเข้าตู้ควบคุม",
    "การกำหนดเป้าหมายลูปเพื่อบันทึกข้อมูล (Select Loop for Logging): ขั้นตอนการเลือกวงจร PID เฉพาะที่ต้องการดึงประวัติการทำงาน (Data Logging) ขึ้นมาวิเคราะห์ผ่านระบบจัดการ",
    "การบันทึกการตั้งค่าระบบจัดเก็บ (Save Logging Settings): เมื่อผู้ใช้ปรับแต่งรูปแบบการจัดเก็บข้อมูลเรียบร้อยแล้ว ต้องกดปุ่ม 'Save Settings' เพื่อนำการตั้งค่าใหม่ไปบังคับใช้กับระบบเบื้องหลัง (Backend)",
    "ระบบลบข้อมูลเก่าอัตโนมัติ (Auto-Clear History): ฟังก์ชันลบประวัติการทำงานที่เก่าเกินกำหนด (เช่น 1 เดือน, 3 เดือน หรือ 1 ปี) เพื่อบริหารจัดการพื้นที่จัดเก็บข้อมูล (Storage) ของเกตเวย์ไม่ให้เต็ม",
    "ความถี่ในการบันทึกข้อมูล (Sampling Interval): การเลือกระยะเวลาหน่วงในการบันทึกข้อมูลลงฐานข้อมูล (เช่น บันทึกทุก 1 วินาที หรือ 10 วินาที) ยิ่งบันทึกถี่ ข้อมูลยิ่งละเอียด แต่จะใช้พื้นที่จัดเก็บมากขึ้น",
    "การจัดการพื้นที่จัดเก็บและการใช้งาน USB (Storage & USB Management): ส่วนการกำหนดเส้นทาง (Path) การบันทึกไฟล์ โดยสามารถเมานท์แฟลชไดรฟ์ (Mount USB) เพื่อเปลี่ยนให้ระบบบันทึกไฟล์รายงานลง USB โดยตรง"
];

let html = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Manual - GATE VALVE CONTROL AND MONITORING PROJECT</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        
        :root {
            --primary: #0f172a;
            --secondary: #1e3a8a;
            --accent: #2563eb;
            --text-main: #334155;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --bg: #f8fafc;
        }

        body {
            font-family: 'Sarabun', sans-serif;
            line-height: 1.8;
            color: var(--text-main);
            background-color: #e2e8f0;
            margin: 0;
            padding: 40px 20px;
        }
        
        .document { max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .page { padding: 25mm; min-height: 297mm; box-sizing: border-box; position: relative; }
        .cover-page { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 297mm; }
        .cover-title { font-size: 36px; font-weight: 700; color: var(--primary); margin-bottom: 20px; text-transform: uppercase; }
        .cover-subtitle { font-size: 20px; color: var(--secondary); margin-bottom: 60px; font-weight: 500; }
        .cover-details { margin-top: auto; margin-bottom: 50px; width: 100%; text-align: right; border-top: 2px solid var(--border); padding-top: 20px; }
        .page-break { page-break-after: always; border-bottom: 1px dashed #ccc; margin-bottom: 40px; }
        
        h1.section-title { font-size: 28px; border-bottom: 3px solid var(--accent); padding-bottom: 10px; margin-top: 0; margin-bottom: 30px; color: var(--primary); font-weight: 600;}
        p { margin-bottom: 16px; text-align: justify; font-size: 15px; }
        
        .img-block {
            background-color: #fff;
            border: 1px solid var(--border);
            border-radius: 8px;
            margin: 0 0 35px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            overflow: hidden;
            page-break-inside: avoid;
        }
        .img-block img {
            width: 100%;
            height: auto;
            border-bottom: 1px solid var(--border);
            display: block;
        }
        .img-caption {
            padding: 20px;
            background: #f8fafc;
            border-left: 4px solid var(--accent);
        }
        .img-caption strong {
            color: var(--secondary);
            font-size: 16px;
            display: block;
            margin-bottom: 8px;
        }
        .img-caption span {
            color: var(--text-main);
            font-size: 15px;
            line-height: 1.7;
        }

        .btn-print {
            display: block; width: 250px; margin: 0 auto 30px auto; padding: 16px; 
            background: var(--accent); color: white; text-align: center; text-decoration: none;
            border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 16px;
        }
        .btn-print:hover { background: #1d4ed8; }

        @media print {
            body { background: white; margin: 0; padding: 0; }
            .document { box-shadow: none; max-width: 100%; width: 100%; margin: 0; }
            .page-break { page-break-after: always; border-bottom: none; margin-bottom: 0; }
            .btn-print { display: none; }
            .page { padding: 20mm; min-height: auto; }
            .cover-page { height: 100vh; }
        }
    </style>
</head>
<body>

    <button class="btn-print" onclick="window.print()">🖨️ พิมพ์เอกสาร (Save as PDF)</button>

    <div class="document">
        
        <div class="page cover-page page-break">
            <div class="cover-title">คู่มือปฏิบัติงานและส่วนติดต่อผู้ใช้<br>(User Manual & Interface Guide)</div>
            <div class="cover-subtitle">ระบบควบคุมและตรวจสอบ (HMI Gate Valve Control)<br>โครงการ: GATE VALVE CONTROL AND MONITORING PROJECT<br>พื้นที่: PIN MILL PLANT</div>
            
            <div class="cover-details">
                <p><strong>ชื่อระบบ:</strong> SIMATIC IOT2050 PID Tuning Application</p>
                <p><strong>เวอร์ชัน (Version):</strong> 3.0 (ฉบับสมบูรณ์ทางการ)</p>
                <p><strong>วันที่อัปเดตล่าสุด:</strong> 31 กรกฎาคม 2026</p>
            </div>
        </div>

        <div class="page">
            <h1 class="section-title">คำอธิบายหน้าจอและฟังก์ชันการทำงาน (System Functions)</h1>
            <p>คู่มือฉบับนี้อธิบายฟังก์ชันการทำงานของระบบ HMI อย่างละเอียดผ่านภาพประกอบจากระบบจริง เพื่อให้ผู้ปฏิบัติงาน (Operator) และวิศวกร (Engineer) สามารถใช้งานระบบควบคุม Gate Valve ได้อย่างถูกต้องและปลอดภัย</p>
`;

for (let i = 1; i <= 34; i++) {
    // Break page every 3 images to keep PDF clean
    if (i > 1 && (i - 1) % 3 === 0) {
        html += `</div><div class="page page-break">`;
    }
    
    html += `
            <div class="img-block">
                <img src="Khife gatevalve picture/LINE_NOTE_260731_${i}.jpg" onerror="this.parentElement.style.display='none'">
                <div class="img-caption">
                    <strong>ภาพประกอบที่ ${i}:</strong>
                    <span>${descriptions[i-1]}</span>
                </div>
            </div>`;
}

html += `
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync('C:\\Users\\xSixtanic\\Desktop\\User_Manual_Final.html', html, 'utf8');
console.log('Generated successfully');
