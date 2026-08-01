const fs = require('fs');

const images = {
    1: "หน้าต่างกราฟแนวโน้ม (Trend Dashboard): แสดงผลการทำงานของระบบแบบ Real-time โดยแสดงความสัมพันธ์ระหว่างค่า Setpoint (SP), Process Value (PV) และ Output (%) ช่วยให้วิศวกรสามารถวิเคราะห์เสถียรภาพของระบบและการตอบสนองของวาล์วได้อย่างแม่นยำ",
    2: "หน้าต่างตั้งค่าพารามิเตอร์ (Parameter Configuration): หน้าจอสำหรับผู้ดูแลระบบในการปรับจูนค่า Proportional Gain (Kp), Integral Time (Ti), และ Derivative Time (Td) รวมถึงการตั้งขีดจำกัด (Limits) สำหรับ Input และ Output ของระบบ PID",
    3: "หน้าต่างจำลองการทำงาน (Simulation Mode): ฟังก์ชันสำหรับทดสอบการตอบสนองของระบบ (Step Test) โดยจำลองกระบวนการทางคณิตศาสตร์ (FOPDT) ก่อนนำค่าพารามิเตอร์ไปใช้งานจริงกับกระบวนการผลิต ป้องกันความเสียหายที่อาจเกิดขึ้น",
    4: "หน้าต่างแผงควบคุมหลัก (Main Dashboard): ศูนย์กลางการแสดงสถานะของ PID Loop ประกอบด้วยตัวเลขขนาดใหญ่สำหรับสังเกตการณ์ค่า SP, PV และ Output พร้อมปุ่มควบคุมโหมดการทำงานของวาล์ว (Auto/Manual/Inactive)",
    5: "หน้าต่างบันทึกข้อมูล (Data Logging): ส่วนจัดการระบบประวัติการทำงานและเก็บข้อมูลย้อนหลัง (Historical Data) รองรับการดึงข้อมูลออกมาในรูปแบบไฟล์ CSV และ PDF เพื่อนำไปทำรายงานสรุป",
    6: "การเพิ่มลูปควบคุม (Add PID Loop): ขั้นตอนการสร้างหรือเพิ่ม PID Loop ใหม่เข้าสู่ระบบ โดยผู้ใช้ต้องระบุชื่อลูป (Loop Name) และหมายเลข Data Block (Instance DB Number) ให้ตรงกับที่เขียนไว้ใน PLC",
    7: "การเลือกโหมดการควบคุม (Control Mode Selection): ขั้นตอนการสลับโหมดการทำงานของวาล์ว ประกอบด้วย โหมดอัตโนมัติ (Auto), โหมดควบคุมด้วยมือ (Manual) และโหมดหยุดการทำงาน (Inactive)",
    8: "การเชื่อมต่อระบบ (System Connection): ขั้นตอนการระบุหมายเลข IP Address ของ PLC S7-1200 พร้อมทั้งหมายเลข Rack และ Slot เพื่อสร้างช่องทางการสื่อสาร (S7 Communication) ระหว่าง HMI และอุปกรณ์คอนโทรลเลอร์",
    9: "สถานะของ PID Loop (Loop Status Indicators): การแสดงสถานะการทำงานปัจจุบันของแต่ละวงจรควบคุมด้วยสี ได้แก่ สีเขียว (Auto Mode), สีแดง (Manual Mode) และ สีเทา (Inactive Mode) เพื่อให้สังเกตได้ง่ายจากระยะไกล",
    10: "การตั้งค่าเป้าหมายเร่งด่วน (Quick Setpoint): ฟังก์ชันสำหรับผู้ใช้งาน (Operator) ในการป้อนค่าเป้าหมาย (Setpoint) ที่ต้องการควบคุมอย่างรวดเร็ว โดยระบบจะส่งค่าไปยัง PLC ทันทีเมื่อกดปุ่ม Set",
    11: "การตั้งค่าวันและเวลา (System Time Configuration): หน้าต่างสำหรับซิงโครไนซ์วันและเวลา (Date/Time) ของบอร์ด IOT2050 ให้ตรงกับเวลามาตรฐาน เพื่อความถูกต้องในการประทับเวลา (Timestamp) ของข้อมูลในไฟล์รายงาน",
    12: "แถบเมนูจัดการระบบ (System Management Bar): แถบคำสั่งระดับผู้ดูแลระบบ ประกอบด้วยปุ่มสำหรับตั้งค่า Data Block Offsets, ลบข้อมูลประวัติ (Clear History), ล็อคหน้าจอ (Lock), รีสตาร์ทระบบ (Restart) และปิดเครื่อง (Power Off)",
    13: "การกำหนดตำแหน่งหน่วยความจำ (Data Block Offsets): หน้าจอระดับวิศวกรรมสำหรับจับคู่ตำแหน่ง Address (Byte Offset) ของตัวแปรต่างๆ ระหว่างระบบ HMI และตัวแปรใน Data Block ของ TIA Portal",
    14: "ระบบรักษาความปลอดภัย (Security PIN Unlock): หน้าต่างยืนยันตัวตนด้วยรหัสผ่าน 4 หลัก (PIN) ป้องกันมิให้ผู้ที่ไม่มีส่วนเกี่ยวข้องเข้ามาแก้ไขพารามิเตอร์สำคัญของระบบหรือเปลี่ยนแปลงการตั้งค่า Data Block",
    15: "การอ่านและบันทึกพารามิเตอร์ (Read/Write Parameters): ปุ่มคำสั่งสำหรับดึงค่าพารามิเตอร์ล่าสุดจาก PLC (Read from PLC) หรือเขียนค่าที่ปรับจูนใหม่ลงสู่ PLC (Write to PLC) ผ่านโปรโตคอลการสื่อสาร",
    16: "การแจ้งเตือนข้อผิดพลาด (Alarm Notification): หน้าต่าง Pop-up แสดงข้อความแจ้งเตือนสีแดง (PID ALARM) ทันทีเมื่อระบบตรวจพบความผิดปกติ เช่น เซ็นเซอร์ขาด (Wire break) หรือค่าออกนอกเกณฑ์ (Out of limits)",
    17: "การรับทราบและรีเซ็ตข้อผิดพลาด (Error Acknowledge): เมื่อปัญหาหน้างานได้รับการแก้ไข ผู้ใช้งานต้องกดปุ่ม 'Reset Error' เพื่อล้างสถานะข้อผิดพลาดในระบบ PLC และให้ลูปควบคุมกลับมาทำงานตามปกติ",
    18: "ประวัติข้อผิดพลาด (Alarm History): ตารางเก็บบันทึกประวัติการเกิดข้อผิดพลาดทั้งหมดของระบบ พร้อมระบุวันเวลาและคำแนะนำในการแก้ไขเบื้องต้น หากต้องการล้างประวัติสามารถกดปุ่ม Clear Alarms ได้",
    19: "การจำลองสถานการณ์และการปรับจูน (Simulation Tuning): ส่วนการกำหนดค่าพารามิเตอร์สมมติในโหมด Simulation เพื่อจำลองพฤติกรรมทางพลศาสตร์ของวาล์ว (Dynamic Behavior) ว่าตอบสนองตามทฤษฎีหรือไม่",
    20: "ระบบคำนวณพารามิเตอร์อัตโนมัติ (Auto-Tune Calculator): ฟังก์ชันคำนวณค่า Kp, Ti, Td ทางคณิตศาสตร์จากโมเดล FOPDT แบบอัตโนมัติ ช่วยลดเวลาการลองผิดลองถูกของวิศวกรในการปรับจูนระบบ",
    21: "การนำค่าคำนวณไปใช้งาน (Apply Calculated Parameters): ผู้ใช้สามารถนำค่าพารามิเตอร์ที่ระบบคำนวณให้ (ตามวิธี Ziegler-Nichols หรือ Cohen-Coon) ไปใช้งานจริง โดยกดปุ่ม Apply ค่าเหล่านั้นจะถูกส่งไปยังหน้า Parameters ทันที",
    22: "ส่วนควบคุมการบันทึกข้อมูล (Data Logging Overview): หน้าต่างหลักสำหรับกำหนดค่าการจัดเก็บข้อมูล (Logging) ซึ่งครอบคลุมทั้งความถี่ในการบันทึก, การจัดการพื้นที่จัดเก็บ และการดาวน์โหลดข้อมูลดิบ",
    23: "การส่งออกข้อมูลดิบ (CSV Data Export): กระบวนการส่งออกประวัติการทำงานในรูปแบบไฟล์ Spreadsheet (.csv) เพื่อนำไปวิเคราะห์ชั้นสูงต่อในโปรแกรมเช่น Microsoft Excel",
    24: "โครงสร้างข้อมูลในไฟล์ CSV (CSV Data Structure): ตัวอย่างไฟล์ข้อมูลที่ถูกส่งออก ซึ่งประกอบด้วยคอลัมน์ Timestamp, Setpoint, Process Value, Output และสถานะ ErrorBits ครบถ้วนทุกๆ วินาที",
    25: "รายงานสรุปรูปแบบ PDF (PDF Summary Report): ระบบสามารถสร้างรายงานสรุปผลการทำงานอัตโนมัติในรูปแบบ PDF ประกอบด้วยตารางข้อมูล โลโก้โครงการ และกราฟสรุป สะดวกต่อการพิมพ์และนำเสนอ",
    26: "การจัดระเบียบไฟล์ข้อมูล (Directory Structure): การจัดเก็บไฟล์รายงานในระบบจะถูกแบ่งแยกออกเป็นโฟลเดอร์ตามชื่อของ PID Loop อย่างเป็นระเบียบ เพื่อความรวดเร็วในการค้นหาข้อมูลย้อนหลัง",
    27: "กระบวนการเริ่มต้นระบบใหม่ (System Reboot): หน้าจอแสดงสถานะเมื่อผู้ใช้กดปุ่ม Restart ระบบจะทำการเริ่มเซอร์วิสของแอปพลิเคชันใหม่ โดยกระบวนการนี้จะไม่กระทบต่อการทำงานของวาล์วที่ PLC ควบคุมอยู่",
    28: "กระบวนการปิดระบบอย่างปลอดภัย (System Shutdown): หน้าจอแสดงสถานะเมื่อผู้ใช้กดปุ่ม Power Off แนะนำให้ใช้ฟังก์ชันนี้เสมอเมื่อต้องการตัดไฟระบบ เพื่อป้องกันปัญหาไฟล์คอร์รัปต์หรือระบบปฏิบัติการเสียหาย",
    29: "การเปิดระบบอัตโนมัติ (Auto-Start on Boot): ภาพแสดงกระบวนการทำงานของเซอร์วิส (Systemd) ที่จะดึงระบบ HMI ขึ้นมาแสดงผลบนหน้าจออัตโนมัติ (Kiosk Mode) ทันทีที่จ่ายไฟเข้าตู้ควบคุม",
    30: "การกำหนดเป้าหมายลูปเพื่อบันทึกข้อมูล (Select Loop for Logging): ขั้นตอนการเลือกวงจร PID เฉพาะที่ต้องการดึงประวัติการทำงาน (Data Logging) ขึ้นมาวิเคราะห์ผ่านระบบจัดการ",
    31: "การบันทึกการตั้งค่าระบบจัดเก็บ (Save Logging Settings): เมื่อผู้ใช้ปรับแต่งรูปแบบการจัดเก็บข้อมูลเรียบร้อยแล้ว ต้องกดปุ่ม 'Save Settings' เพื่อนำการตั้งค่าใหม่ไปบังคับใช้กับระบบเบื้องหลัง (Backend)",
    32: "ระบบลบข้อมูลเก่าอัตโนมัติ (Auto-Clear History): ฟังก์ชันลบประวัติการทำงานที่เก่าเกินกำหนด (เช่น 1 เดือน, 3 เดือน หรือ 1 ปี) เพื่อบริหารจัดการพื้นที่จัดเก็บข้อมูล (Storage) ของเกตเวย์ไม่ให้เต็ม",
    33: "ความถี่ในการบันทึกข้อมูล (Sampling Interval): การเลือกระยะเวลาหน่วงในการบันทึกข้อมูลลงฐานข้อมูล (เช่น บันทึกทุก 1 วินาที หรือ 10 วินาที) ยิ่งบันทึกถี่ ข้อมูลยิ่งละเอียด แต่จะใช้พื้นที่จัดเก็บมากขึ้น",
    34: "การยืนยันการตั้งค่า (Confirm Logging Loop): ส่วนการยืนยันการเลือก PID Loop ที่ต้องการบันทึกข้อมูล เพื่อป้องกันความผิดพลาดก่อนเริ่มบันทึก"
};

const chapters = [
    {
        title: "บทที่ 1: การเริ่มต้นระบบและการตั้งค่าพื้นฐาน (System Startup & Setup)",
        desc: "อธิบายกระบวนการเริ่มต้นของระบบ การตั้งค่าเวลา และการจัดการระบบระดับสูง",
        imgIds: [29, 11, 14, 12, 27, 28]
    },
    {
        title: "บทที่ 2: การสร้างลูปและการเชื่อมต่อเครือข่าย (Loop Setup & PLC Connection)",
        desc: "การสร้าง PID Loop ในระบบ และการตั้งค่า IP Address เพื่อสื่อสารกับ PLC",
        imgIds: [6, 13, 8]
    },
    {
        title: "บทที่ 3: แผงควบคุมหลักและโหมดการทำงาน (Dashboard & Control Modes)",
        desc: "หน้าจอแสดงผลหลักที่ Operator ใช้งานบ่อยที่สุดในการสั่งการวาล์ว",
        imgIds: [4, 7, 9, 10]
    },
    {
        title: "บทที่ 4: การวิเคราะห์กราฟแนวโน้ม (Trend Analysis)",
        desc: "การเรียกดูกราฟเพื่อติดตามเสถียรภาพของกระบวนการ",
        imgIds: [1]
    },
    {
        title: "บทที่ 5: การปรับจูนพารามิเตอร์ (PID Parameter Tuning)",
        desc: "ส่วนของวิศวกรในการปรับความไวของลูปควบคุม",
        imgIds: [2, 15]
    },
    {
        title: "บทที่ 6: การจำลองการทำงานและ Auto-Tuning (Simulation)",
        desc: "การทดสอบการตอบสนองผ่านโมเดลคณิตศาสตร์และการคำนวณพารามิเตอร์อัตโนมัติ",
        imgIds: [3, 19, 20, 21]
    },
    {
        title: "บทที่ 7: การบันทึกและส่งออกข้อมูล (Data Logging & Export)",
        desc: "การจัดการระบบจัดเก็บข้อมูลและการพิมพ์รายงาน",
        imgIds: [5, 22, 30, 33, 32, 34, 31, 23, 24, 25, 26]
    },
    {
        title: "บทที่ 8: การจัดการข้อผิดพลาด (Alarm & Troubleshooting)",
        desc: "การรับมือเมื่อเกิดความผิดปกติในระบบ",
        imgIds: [16, 17, 18]
    }
];

let html = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Manual - GATE VALVE CONTROL</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        
        :root {
            --primary: #0f172a;
            --secondary: #1e3a8a; /* Deep blue professional tone */
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
        
        .document {
            max-width: 210mm; /* A4 width */
            margin: 0 auto;
            background: white;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .page {
            padding: 25mm;
            min-height: 297mm; /* A4 height */
            box-sizing: border-box;
            position: relative;
        }

        .cover-page {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            border-bottom: none;
            height: 297mm;
        }

        .cover-title { font-size: 36px; font-weight: 700; color: var(--primary); margin-bottom: 20px; text-transform: uppercase; }
        .cover-subtitle { font-size: 20px; color: var(--secondary); margin-bottom: 60px; font-weight: 500; }
        .cover-details { margin-top: auto; margin-bottom: 50px; width: 100%; text-align: right; border-top: 2px solid var(--border); padding-top: 20px; }
        .cover-details p { margin: 5px 0; font-size: 16px; color: var(--text-muted); }
        .page-break { page-break-after: always; border-bottom: 1px dashed #ccc; margin-bottom: 40px; }

        h1, h2, h3, h4 { color: var(--primary); font-weight: 600; }
        h1.section-title { font-size: 28px; border-bottom: 3px solid var(--accent); padding-bottom: 10px; margin-top: 0; margin-bottom: 20px; }
        h2 { font-size: 22px; margin-top: 40px; color: var(--secondary); display: flex; align-items: center; }
        h2::before { content: ''; display: inline-block; width: 8px; height: 24px; background-color: var(--accent); margin-right: 15px; border-radius: 4px; }
        
        p { margin-bottom: 16px; text-align: justify; font-size: 15px; }

        .img-block {
            background-color: #fff;
            border: 1px solid var(--border);
            border-radius: 8px;
            margin: 30px 0;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
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
            background: #f0f9ff; /* Light blue tint */
            border-left: 5px solid var(--accent);
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
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
            transition: all 0.3s ease;
        }
        .btn-print:hover { background: #1d4ed8; transform: translateY(-2px); }
        
        .toc { background: var(--bg); padding: 30px; border-radius: 8px; border: 1px solid var(--border); }
        .toc ul { list-style-type: none; padding-left: 0; }
        .toc ul li { padding: 8px 0; border-bottom: 1px dashed var(--border); }
        .toc ul li a { text-decoration: none; color: var(--text-main); font-weight: 500; font-size: 16px; }

        .footer {
            position: absolute;
            bottom: 15mm;
            left: 25mm;
            right: 25mm;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: var(--text-muted);
            border-top: 1px solid var(--border);
            padding-top: 10px;
        }

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
        
        <!-- Cover Page -->
        <div class="page cover-page page-break">
            <img src="logo.png" alt="Mitr Phol Logo" style="height: 120px; margin-bottom: 40px; display: none;" onload="this.style.display='block'">
            <div class="cover-title">คู่มือการใช้งานระบบ (ฉบับสมบูรณ์)<br>(User Manual - Comprehensive Guide)</div>
            <div class="cover-subtitle">ระบบควบคุมและตรวจสอบ (HMI Gate Valve Control)<br>โครงการ: GATE VALVE CONTROL AND MONITORING PROJECT<br>พื้นที่: PIN MILL PLANT</div>
            
            <div class="cover-details">
                <p><strong>ชื่อระบบ:</strong> SIMATIC IOT2050 PID Tuning Application</p>
                <p><strong>เวอร์ชัน (Version):</strong> 3.0</p>
                <p><strong>แผนก/ฝ่าย:</strong> Automation Control Engineering</p>
                <p><strong>วันที่อัปเดตล่าสุด:</strong> 31 กรกฎาคม 2026</p>
            </div>
        </div>

        <!-- Table of Contents -->
        <div class="page page-break">
            <h1 class="section-title">สารบัญ (Table of Contents)</h1>
            <div class="toc">
                <ul>
`;

chapters.forEach((chap, idx) => {
    html += `<li><a href="#chap${idx}">${chap.title}</a></li>`;
});

html += `
                </ul>
            </div>
            
            <div style="margin-top: 40px; padding: 20px; background: #e0f2fe; border-left: 5px solid #0ea5e9; border-radius: 4px;">
                <strong>บทนำ:</strong> คู่มือฉบับนี้ถูกจัดทำขึ้นด้วยเค้าโครงเอกสารแบบมืออาชีพ (Professional Layout) โดยได้นำภาพประกอบจากหน้าจอระบบจริงทั้ง 34 รูป มาอธิบายและแทรกตามหมวดหมู่การใช้งานอย่างเป็นขั้นตอน เพื่อความเข้าใจสูงสุดในการปฏิบัติงาน
            </div>
        </div>
`;

// Generate chapters
chapters.forEach((chap, idx) => {
    html += `
        <!-- Chapter ${idx + 1} -->
        <div class="page page-break">
            <h1 class="section-title" id="chap${idx}">${chap.title}</h1>
            <p>${chap.desc}</p>
    `;
    
    let imgCounter = 0;
    chap.imgIds.forEach((imgId) => {
        imgCounter++;
        // If more than 2 images in this chapter, break page to avoid overflow
        if (imgCounter > 2) {
            html += `</div><div class="page page-break">`;
            imgCounter = 1;
        }

        html += `
            <div class="img-block">
                <img src="Khife gatevalve picture/LINE_NOTE_260731_${imgId}.jpg" onerror="this.parentElement.style.display='none'">
                <div class="img-caption">
                    <strong>ภาพประกอบที่ ${imgId}:</strong>
                    <span>${images[imgId]}</span>
                </div>
            </div>`;
    });
    
    html += `
            <div class="footer">
                <span>คู่มือการใช้งานระบบ (Version 3.0)</span>
                <span>หมวดหมู่: ${chap.title.split(':')[0]}</span>
            </div>
        </div>
    `;
});

html += `
    </div>
</body>
</html>`;

fs.writeFileSync('C:\\Users\\xSixtanic\\Desktop\\User_Manual_Ultimate.html', html, 'utf8');
console.log('Generated successfully');
