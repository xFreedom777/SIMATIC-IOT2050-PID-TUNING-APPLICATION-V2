const fs = require('fs');

const images = {
    1: "หน้าต่างกราฟแนวโน้ม (Trend Dashboard): แสดงผลการทำงานของระบบแบบ Real-time โดยแสดงความสัมพันธ์ระหว่างค่า Setpoint (SP), Process Value (PV) และ Output (%) ช่วยให้วิศวกรสามารถวิเคราะห์เสถียรภาพของระบบและการตอบสนองของวาล์วได้อย่างแม่นยำ",
    2: "หน้าต่างตั้งค่าพารามิเตอร์ (Parameter Configuration): หน้าจอสำหรับผู้ดูแลระบบในการปรับจูนค่า Proportional Gain (Kp), Integral Time (Ti), และ Derivative Time (Td) รวมถึงการตั้งขีดจำกัด (Limits) สำหรับ Input และ Output ของระบบ PID",
    3: "หน้าต่างจำลองการทำงาน (Simulation Mode): ฟังก์ชันสำหรับทดสอบการตอบสนองของระบบ (Step Test) โดยจำลองกระบวนการทางคณิตศาสตร์ (FOPDT)",
    4: "หน้าต่างแผงควบคุมหลัก (Main Dashboard): ศูนย์กลางการแสดงสถานะของ PID Loop ประกอบด้วยตัวเลขขนาดใหญ่สำหรับสังเกตการณ์ค่า SP, PV และ Output",
    5: "หน้าต่างบันทึกข้อมูล (Data Logging): ส่วนจัดการระบบประวัติการทำงานและเก็บข้อมูลย้อนหลัง (Historical Data) รองรับการดึงข้อมูลออกมาในรูปแบบไฟล์ CSV และ PDF",
    6: "การเพิ่มลูปควบคุม (Add PID Loop): ขั้นตอนการสร้างหรือเพิ่ม PID Loop ใหม่เข้าสู่ระบบ",
    7: "การเลือกโหมดการควบคุม (Control Mode Selection): ขั้นตอนการสลับโหมดการทำงานของวาล์ว ประกอบด้วย โหมดอัตโนมัติ (Auto), โหมดควบคุมด้วยมือ (Manual) และโหมดหยุดการทำงาน (Inactive)",
    8: "การเชื่อมต่อระบบ (System Connection): ขั้นตอนการระบุหมายเลข IP Address ของ PLC S7-1200 พร้อมทั้งหมายเลข Rack และ Slot เพื่อสร้างช่องทางการสื่อสาร",
    9: "สถานะของ PID Loop (Loop Status Indicators): การแสดงสถานะการทำงานปัจจุบันของแต่ละวงจรควบคุมด้วยสี",
    10: "การตั้งค่าเป้าหมายเร่งด่วน (Quick Setpoint): ฟังก์ชันสำหรับผู้ใช้งานในการป้อนค่าเป้าหมาย (Setpoint) อย่างรวดเร็ว",
    11: "การตั้งค่าวันและเวลา (System Time Configuration): หน้าต่างสำหรับซิงโครไนซ์วันและเวลา (Date/Time) ของบอร์ด IOT2050",
    12: "แถบเมนูจัดการระบบ (System Management Bar): แถบคำสั่งระดับผู้ดูแลระบบ ประกอบด้วยปุ่มสำหรับตั้งค่า Data Block Offsets, ลบข้อมูลประวัติ ฯลฯ",
    13: "การกำหนดตำแหน่งหน่วยความจำ (Data Block Offsets): หน้าจอระดับวิศวกรรมสำหรับจับคู่ตำแหน่ง Address (Byte Offset) ของตัวแปรต่างๆ",
    14: "ระบบรักษาความปลอดภัย (Security PIN Unlock): หน้าต่างยืนยันตัวตนด้วยรหัสผ่าน 4 หลัก (PIN)",
    15: "การอ่านและบันทึกพารามิเตอร์ (Read/Write Parameters): ปุ่มคำสั่งสำหรับดึงค่าพารามิเตอร์ล่าสุดจาก PLC หรือเขียนค่าที่ปรับจูนใหม่ลงสู่ PLC",
    16: "การแจ้งเตือนข้อผิดพลาด (Alarm Notification): หน้าต่าง Pop-up แสดงข้อความแจ้งเตือนสีแดงทันทีเมื่อระบบตรวจพบความผิดปกติ",
    17: "การรับทราบและรีเซ็ตข้อผิดพลาด (Error Acknowledge): กดปุ่ม 'Reset Error' เพื่อล้างสถานะข้อผิดพลาด",
    18: "ประวัติข้อผิดพลาด (Alarm History): ตารางเก็บบันทึกประวัติการเกิดข้อผิดพลาดทั้งหมดของระบบ",
    19: "การจำลองสถานการณ์และการปรับจูน (Simulation Tuning): ส่วนการกำหนดค่าพารามิเตอร์สมมติในโหมด Simulation",
    20: "ระบบคำนวณพารามิเตอร์อัตโนมัติ (Auto-Tune Calculator): ฟังก์ชันคำนวณค่า Kp, Ti, Td ทางคณิตศาสตร์จากโมเดล FOPDT แบบอัตโนมัติ",
    21: "การนำค่าคำนวณไปใช้งาน (Apply Calculated Parameters): นำค่าพารามิเตอร์ที่ระบบคำนวณให้ไปใช้งานจริง",
    22: "ส่วนควบคุมการบันทึกข้อมูล (Data Logging Overview): หน้าต่างหลักสำหรับกำหนดค่าการจัดเก็บข้อมูล",
    23: "การส่งออกข้อมูลดิบ (CSV Data Export): กระบวนการส่งออกประวัติการทำงานในรูปแบบไฟล์ Spreadsheet",
    24: "โครงสร้างข้อมูลในไฟล์ CSV (CSV Data Structure): ตัวอย่างไฟล์ข้อมูลที่ถูกส่งออก ซึ่งประกอบด้วยคอลัมน์ Timestamp, SP, PV, Output และ ErrorBits",
    25: "รายงานสรุปรูปแบบ PDF (PDF Summary Report): ระบบสร้างรายงานสรุปผลการทำงานอัตโนมัติในรูปแบบ PDF",
    26: "การจัดระเบียบไฟล์ข้อมูล (Directory Structure): การจัดเก็บไฟล์รายงานแบ่งแยกโฟลเดอร์ตามชื่อของ PID Loop",
    27: "กระบวนการเริ่มต้นระบบใหม่ (System Reboot): หน้าจอแสดงสถานะเมื่อผู้ใช้กดปุ่ม Restart",
    28: "กระบวนการปิดระบบอย่างปลอดภัย (System Shutdown): หน้าจอแสดงสถานะเมื่อผู้ใช้กดปุ่ม Power Off",
    29: "การเปิดระบบอัตโนมัติ (Auto-Start on Boot): การทำงานของเซอร์วิสที่จะดึงระบบ HMI ขึ้นมาแสดงผลอัตโนมัติทันทีที่จ่ายไฟ",
    30: "การกำหนดเป้าหมายลูปเพื่อบันทึกข้อมูล (Select Loop for Logging): ขั้นตอนการเลือกวงจร PID เฉพาะที่ต้องการดึงประวัติ",
    31: "การบันทึกการตั้งค่าระบบจัดเก็บ (Save Logging Settings): ต้องกดปุ่ม 'Save Settings' เพื่อบังคับใช้การตั้งค่า",
    32: "ระบบลบข้อมูลเก่าอัตโนมัติ (Auto-Clear History): ฟังก์ชันลบประวัติการทำงานที่เก่าเกินกำหนดเพื่อบริหารพื้นที่จัดเก็บ",
    33: "ความถี่ในการบันทึกข้อมูล (Sampling Interval): การเลือกระยะเวลาหน่วงในการบันทึกข้อมูลลงฐานข้อมูล",
    34: "การยืนยันการตั้งค่า (Confirm Logging Loop): ส่วนการยืนยันการเลือก PID Loop ที่ต้องการบันทึกข้อมูล"
};

function renderImg(id) {
    return `
            <div class="img-block">
                <img src="Khife gatevalve picture/LINE_NOTE_260731_${id}.jpg" onerror="this.parentElement.style.display='none'">
                <div class="img-caption">
                    <strong>ภาพประกอบที่ ${id}:</strong>
                    <span>${images[id]}</span>
                </div>
            </div>`;
}

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
            --secondary: #1e3a8a;
            --accent: #2563eb;
            --text-main: #334155;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --bg: #f8fafc;
        }

        body { font-family: 'Sarabun', sans-serif; line-height: 1.8; color: var(--text-main); background-color: #e2e8f0; margin: 0; padding: 40px 20px; }
        .document { max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .page { padding: 25mm; min-height: 297mm; box-sizing: border-box; position: relative; }
        .cover-page { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 297mm; }
        .cover-title { font-size: 36px; font-weight: 700; color: var(--primary); margin-bottom: 20px; text-transform: uppercase; }
        .cover-subtitle { font-size: 20px; color: var(--secondary); margin-bottom: 60px; font-weight: 500; }
        .cover-details { margin-top: auto; margin-bottom: 50px; width: 100%; text-align: right; border-top: 2px solid var(--border); padding-top: 20px; }
        .cover-details p { margin: 5px 0; font-size: 16px; color: var(--text-muted); }
        .page-break { page-break-after: always; border-bottom: 1px dashed #ccc; margin-bottom: 40px; }

        h1, h2, h3, h4 { color: var(--primary); font-weight: 600; }
        h1.section-title { font-size: 28px; border-bottom: 3px solid var(--accent); padding-bottom: 10px; margin-top: 0; margin-bottom: 20px; }
        h2 { font-size: 22px; margin-top: 40px; color: var(--secondary); display: flex; align-items: center; }
        h2::before { content: ''; display: inline-block; width: 8px; height: 24px; background-color: var(--accent); margin-right: 15px; border-radius: 4px; }
        h3 { font-size: 18px; color: var(--primary); margin-top: 30px; }
        h4 { font-size: 16px; color: var(--text-main); margin-top: 20px; text-decoration: underline; }
        
        p, li { margin-bottom: 16px; text-align: justify; font-size: 15px; }
        ul, ol { padding-left: 30px; }

        .img-block { background-color: #fff; border: 1px solid var(--border); border-radius: 8px; margin: 30px 0; box-shadow: 0 4px 10px rgba(0,0,0,0.05); overflow: hidden; page-break-inside: avoid; }
        .img-block img { width: 100%; height: auto; border-bottom: 1px solid var(--border); display: block; }
        .img-caption { padding: 20px; background: #f0f9ff; border-left: 5px solid var(--accent); }
        .img-caption strong { color: var(--secondary); font-size: 16px; display: block; margin-bottom: 8px; }
        .img-caption span { color: var(--text-main); font-size: 15px; line-height: 1.7; }

        table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; font-size: 14px; }
        th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; vertical-align: top; }
        th { background-color: var(--bg); color: var(--primary); font-weight: 600; }

        .btn-print { display: block; width: 250px; margin: 0 auto 30px auto; padding: 16px; background: var(--accent); color: white; text-align: center; text-decoration: none; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 16px; }
        .btn-print:hover { background: #1d4ed8; }
        
        .toc { background: var(--bg); padding: 30px; border-radius: 8px; border: 1px solid var(--border); }
        .toc ul { list-style-type: none; padding-left: 0; }
        .toc ul li { padding: 8px 0; border-bottom: 1px dashed var(--border); }
        .toc ul li a { text-decoration: none; color: var(--text-main); font-weight: 500; font-size: 16px; }

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
            <div class="cover-title">คู่มือปฏิบัติงานและส่วนติดต่อผู้ใช้<br>(User Manual - PID Tuning)</div>
            <div class="cover-subtitle">ระบบควบคุมและตรวจสอบ (HMI Gate Valve Control)<br>โครงการ: PIN MILL PLANT GATE VALVE CONTROL AND MONITORING PROJECT</div>
            
            <div class="cover-details">
                <p><strong>จัดทำโดย:</strong> ปิยะพงษ์ นวลจันทร์</p>
                <p><strong>แผนก/ฝ่าย:</strong> Automation Control Engineering</p>
                <p><strong>เวอร์ชัน (Version):</strong> 3.0 (ฉบับบูรณาการภาพประกอบ)</p>
                <p><strong>วันที่จัดทำ:</strong> 31 กรกฎาคม 2026</p>
            </div>
        </div>

        <!-- Table of Contents -->
        <div class="page page-break">
            <h1 class="section-title">สารบัญ (Table of Contents)</h1>
            <div class="toc">
                <ul>
                    <li><a href="#chap1">1. บทนำ (Introduction)</a></li>
                    <li><a href="#chap2">2. การเชื่อมต่อกับ PLC และการเริ่มต้นระบบ</a></li>
                    <li><a href="#chap3">3. การเพิ่มและการตั้งค่า PID Loops</a></li>
                    <li><a href="#chap4">4. หน้าควบคุมหลัก (Dashboard & Controls)</a></li>
                    <li><a href="#chap5">5. กราฟและพารามิเตอร์ (Trend & Parameters)</a></li>
                    <li><a href="#chap6">6. ระบบบันทึกข้อมูล (Data Logging)</a></li>
                    <li><a href="#chap7">7. ประวัติการแจ้งเตือน (Alarm History)</a></li>
                    <li><a href="#chap8">8. โหมดจำลอง (Simulation Mode)</a></li>
                </ul>
            </div>
            
            <div style="background-color: #fef2f2; border-left: 5px solid #ef4444; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-top: 30px;">
                <strong style="color: #ef4444; font-size: 16px;">⚠️ ข้อมูลความปลอดภัยและข้อควรระวัง (Safety Warning)</strong>
                <ul style="color: #334155; margin-top: 10px; padding-left: 20px;">
                    <li><strong>ห้ามตัดไฟตู้กะทันหัน:</strong> ให้กดปุ่ม <strong>Power Off</strong> ที่หน้าจอก่อนเสมอ เพื่อป้องกันไฟล์ระบบหรือข้อมูลประวัติเสียหาย</li>
                    <li><strong>ระวังกลไกวาล์ว:</strong> เมื่อระบบอยู่ในโหมด Auto ห้ามนำมือหรือสิ่งของเข้าไปใกล้กลไกการเคลื่อนที่ของวาล์ว เนื่องจากวาล์วอาจขยับแบบอัตโนมัติตลอดเวลา</li>
                    <li><strong>เหตุฉุกเฉิน:</strong> หากพบความผิดปกติรุนแรง ให้เปลี่ยนโหมดเป็น <strong>Inactive</strong> เพื่อตัดการทำงานของวาล์วทันที</li>
                </ul>
            </div>
        </div>

        <!-- Chapter 1 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap1">1. บทนำ (Introduction)</h1>
            <p>ระบบ <strong>Pin Mill Plant Gate Valve Control and Monitoring</strong> ถูกพัฒนาขึ้นเพื่ออำนวยความสะดวกในการควบคุมและติดตามการทำงานของวาล์วภายในโรงงาน โดยมุ่งเน้นที่การทำงานของวงจร <strong>PID (Proportional-Integral-Derivative)</strong> ซึ่งเป็นหัวใจสำคัญในการรักษาระดับการจ่ายวัตถุดิบ (Process Value) ให้นิ่งและเสถียรที่สุด</p>
            <p>ระบบนี้เข้ามาเป็นตัวกลาง ทำหน้าที่เป็นหน้าจอ Web Application ที่สามารถประมวลผลบนบอร์ด IOT2050 (หรืออุปกรณ์ Edge Controller อื่นๆ) ทำให้ Operator หรือช่างหน้างานสามารถ:</p>
            <ul>
                <li>สั่งการเปลี่ยนโหมด Auto/Manual และตั้งค่า Setpoint ได้ทันทีผ่านหน้าจอสัมผัส</li>
                <li>สังเกตการณ์กราฟแนวโน้ม (Trend) แบบ Real-time เพื่อวิเคราะห์ความแม่นยำ</li>
                <li>เก็บข้อมูลประวัติการทำงาน (Data Logging) แบบ 24/7 เพื่อนำไฟล์ไปทำ Report</li>
                <li>รับรู้ถึงความผิดปกติของเซ็นเซอร์และวาล์วได้ทันทีผ่านระบบ Alarm History</li>
            </ul>
            ${renderImg(4)}
        </div>

        <!-- Chapter 2 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap2">2. การเชื่อมต่อกับ PLC และการเริ่มต้นระบบ</h1>
            <p>เนื่องจากระบบไม่ได้ยึดติดกับ PLC ตัวใดตัวหนึ่ง การเริ่มต้นใช้งานทุกครั้ง ผู้ใช้จำเป็นต้องระบุที่อยู่เครือข่ายของ PLC ที่ต้องการเชื่อมต่อ โดยระบบสื่อสารผ่านโปรโตคอล S7-Communication (พอร์ต 102)</p>
            <h4>ขั้นตอนการเชื่อมต่อ:</h4>
            <ol>
                <li>ไปที่เมนู <strong>PLC CONNECTION</strong> บริเวณซ้ายบนของหน้าจอ</li>
                <li><strong>IP Address:</strong> กรอกหมายเลข IP ของ PLC (เช่น <code>192.168.121.211</code>)</li>
                <li><strong>Rack & Slot:</strong> ระบุตำแหน่งของ CPU บนแร็ค สำหรับ S7-1200 ให้ใช้ค่า <strong>Rack: 0, Slot: 1</strong> เสมอ</li>
                <li>คลิกปุ่ม <strong>Connect</strong></li>
            </ol>
            ${renderImg(8)}
            ${renderImg(11)}
            ${renderImg(12)}
        </div>
        <div class="page page-break">
            ${renderImg(27)}
            ${renderImg(28)}
            ${renderImg(29)}
        </div>

        <!-- Chapter 3 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap3">3. การเพิ่มและการตั้งค่า PID Loops</h1>
            <p>ในโรงงานหนึ่งแห่ง อาจมีวาล์วหลายตัวที่ต้องควบคุม ระบบนี้ออกแบบมาให้รองรับการเชื่อมต่อกับหลายๆ Loop ได้พร้อมกัน โดยผู้ใช้สามารถเพิ่มและจัดการได้อย่างง่ายดาย</p>
            <h3>3.1 การเพิ่ม Loop ใหม่ (Add PID Loop)</h3>
            <ol>
                <li>ในส่วนของ <strong>PID LOOPS</strong> ทางฝั่งซ้าย ให้คลิกปุ่ม <strong>+ Add</strong></li>
                <li>ตั้งชื่อที่สื่อถึงอุปกรณ์หน้างาน และระบุหมายเลข Data Block (Instance DB Number)</li>
            </ol>
            ${renderImg(6)}
            
            <h3>3.2 การตั้งค่า DB Offsets (สำคัญที่สุด)</h3>
            <p>โปรโตคอล S7-Communication จะดึงข้อมูลจาก PLC ด้วยการอ้างอิงตำแหน่ง Byte พื้นฐาน (Offset) หากตั้งค่าผิดพลาด ระบบจะทำงานไม่ถูกต้อง</p>
            ${renderImg(13)}
            ${renderImg(14)}
        </div>

        <!-- Chapter 4 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap4">4. หน้าควบคุมหลัก (Dashboard & Controls)</h1>
            <p>เมื่อตั้งค่า Offset ถูกต้องและระบบกำลัง LIVE ข้อมูลจะถูกอ่านจาก PLC ทุกๆ 0.5 วินาที (500ms) และนำมาแสดงผลแบบ Real-time</p>
            ${renderImg(9)}
            ${renderImg(7)}
            ${renderImg(10)}
        </div>

        <!-- Chapter 5 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap5">5. กราฟและพารามิเตอร์ (Trend & Parameters)</h1>
            <h3>5.1 แท็บ Trend (วิเคราะห์กราฟแนวโน้ม)</h3>
            <p>กราฟถูกออกแบบมาเพื่อใช้วิเคราะห์พฤติกรรมของการควบคุม (Control Behavior) แบบสดๆ โดยเส้นสีฟ้าแทน Setpoint, สีเขียวแทน PV, และสีส้มแทน Output%</p>
            ${renderImg(1)}
            
            <h3>5.2 แท็บ Parameters (พารามิเตอร์และการจูน)</h3>
            <p>วิศวกรสามารถปรับจูนพฤติกรรมการตอบสนองของระบบ สามารถดำเนินการได้ผ่านแท็บนี้ เช่น Gain, Ti, Td และปรับแต่งความปลอดภัยผ่าน Limits</p>
            ${renderImg(2)}
            ${renderImg(15)}
        </div>

        <!-- Chapter 6 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap6">6. ระบบบันทึกข้อมูล (Data Logging)</h1>
            <p>เป็นฟีเจอร์ที่สำคัญมากในการตรวจสอบคุณภาพและการทำงานย้อนหลัง ระบบนี้ถูกออกแบบโครงสร้างให้ประมวลผลจัดเก็บข้อมูลได้ตลอด 24 ชั่วโมง</p>
            ${renderImg(5)}
            ${renderImg(22)}
        </div>
        <div class="page page-break">
            ${renderImg(30)}
            ${renderImg(33)}
            ${renderImg(32)}
        </div>
        <div class="page page-break">
            ${renderImg(31)}
            ${renderImg(23)}
            ${renderImg(24)}
            ${renderImg(25)}
            ${renderImg(26)}
        </div>

        <!-- Chapter 7 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap7">7. ประวัติการแจ้งเตือน (Alarm History)</h1>
            <p>ระบบติดตามความผิดปกติ ถูกออกแบบมาเพื่อช่วยเหลือช่างซ่อมบำรุงหน้างาน (Maintenance) เมื่อเครื่องจักรมีปัญหา โดยสามารถแจ้งเตือน ErrorBits จาก PID_Compact ให้ผู้ใช้รับทราบทันที</p>
            ${renderImg(16)}
            ${renderImg(17)}
            ${renderImg(18)}
        </div>

        <!-- Chapter 8 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap8">8. โหมดจำลอง (Simulation Mode)</h1>
            <p>ในบางครั้ง ผู้ใช้งานอาจต้องการทดสอบระบบ แต่ไม่สามารถเชื่อมต่อกับ PLC ของจริงที่กำลังคุมเครื่องจักรได้ ระบบนี้มีโหมดจำลอง (Simulation) โดยสร้างสัญญาณจำลองผ่าน FOPDT Process Model</p>
            ${renderImg(3)}
            ${renderImg(19)}
        </div>
        <div class="page page-break">
            ${renderImg(20)}
            ${renderImg(21)}
        </div>
        
    </div>
</body>
</html>`;

fs.writeFileSync('C:\\Users\\xSixtanic\\Desktop\\User_Manual_Merged.html', html, 'utf8');
console.log('Merged manual generated successfully.');
