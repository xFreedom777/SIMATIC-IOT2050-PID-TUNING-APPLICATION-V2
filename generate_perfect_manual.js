const fs = require('fs');

const images = {
    1: "<strong>หน้ากราฟแนวโน้ม (Trend Dashboard):</strong><br>ใช้สำหรับดูว่าวาล์วทำงานนิ่งหรือไม่<br>• เส้นสีฟ้า คือ เป้าหมาย (Setpoint)<br>• เส้นสีเขียว คือ ค่าจริงที่อ่านได้ (PV)<br>• เส้นสีส้ม คือ การสั่งเปิดวาล์ว (Output %)",
    2: "<strong>หน้าตั้งค่าพารามิเตอร์ (Parameters):</strong><br>สำหรับปรับความไวของวาล์ว (Kp, Ti, Td) และจำกัดการเปิดสูงสุด/ต่ำสุด เพื่อไม่ให้วาล์วกระแทกแรงเกินไป",
    3: "<strong>โหมดจำลอง (Simulation Mode):</strong><br>ใช้ทดลองตั้งค่าวาล์วแบบจำลอง โดยไม่ต้องต่อกับเครื่องจักรจริง ป้องกันอันตรายตอนฝึกใช้งาน",
    4: "<strong>แผงควบคุมหลัก (Dashboard):</strong><br>หน้าจอนี้จะบอกตัวเลขขนาดใหญ่ให้เห็นชัดเจนว่า ตอนนี้วาล์วเปิดอยู่กี่เปอร์เซ็นต์ และค่าเซ็นเซอร์อยู่ที่เท่าไหร่",
    5: "<strong>หน้าบันทึกข้อมูล (Data Logging):</strong><br>ใช้สำหรับตั้งเวลาบันทึกประวัติการทำงาน และสั่งดึงข้อมูลย้อนหลังออกมาเป็นไฟล์ Excel หรือ PDF",
    6: "<strong>การเพิ่มวงจรควบคุม (Add PID Loop):</strong><br>1. กดปุ่ม <strong>+ Add</strong><br>2. พิมพ์ชื่อวาล์วที่ต้องการควบคุม<br>3. ใส่เลขบล็อก (DB) ให้ตรงกับใน PLC",
    7: "<strong>การเปลี่ยนโหมดวาล์ว:</strong><br>• <strong>Auto:</strong> ให้ระบบคุมวาล์วเอง<br>• <strong>Manual:</strong> เราพิมพ์สั่งเปิดวาล์วเอง<br>• <strong>Inactive:</strong> ปิดการทำงานชั่วคราว",
    8: "<strong>การเชื่อมต่อระบบ:</strong><br>1. กรอกเลข IP ของ PLC<br>2. ใส่ค่า Rack: 0 และ Slot: 1<br>3. กดปุ่ม <strong>Connect to PLC</strong>",
    9: "<strong>สีสถานะการทำงาน:</strong><br>สังเกตจุดสีหน้าชื่อวาล์ว:<br>🟢 สีเขียว = กำลังทำงานโหมด Auto<br>🔴 สีแดง = กำลังทำงานโหมด Manual<br>⚪ สีเทา = ปิดการทำงาน (Inactive)",
    10: "<strong>การสั่งงานด่วน (Quick Setpoint):</strong><br>พิมพ์ตัวเลขเป้าหมายที่ต้องการ แล้วกดปุ่ม <strong>Set</strong> วาล์วจะปรับตัวไปหาเป้าหมายทันที",
    11: "<strong>การตั้งเวลา (System Time):</strong><br>กดตั้งวันที่และเวลาของหน้าจอให้ตรงกับปัจจุบัน เพื่อให้ประวัติที่บันทึกมีเวลาที่ถูกต้อง",
    12: "<strong>เมนูจัดการระบบ:</strong><br>แถบด้านบนขวาใช้สำหรับ รีสตาร์ทเครื่อง (Restart), ปิดเครื่อง (Power Off) หรือ ล้างประวัติ (Clear History)",
    13: "<strong>การชี้เป้าตัวแปร (DB Offsets):</strong><br><em>*สำหรับช่างเทคนิค:</em> นำตัวเลข Offset จากโปรแกรม TIA Portal มากรอกให้ตรงกัน ระบบถึงจะดึงข้อมูลมาแสดงได้ถูกต้อง",
    14: "<strong>รหัสผ่าน (PIN Unlock):</strong><br>เมื่อต้องการเปลี่ยนค่าสำคัญ ระบบจะถามรหัส PIN 4 หลัก เพื่อป้องกันคนมากดเล่นหรือแก้ไขโดยไม่ตั้งใจ",
    15: "<strong>การอ่าน/เขียนค่าเข้า PLC:</strong><br>• <strong>Read from PLC:</strong> ดึงค่าล่าสุดจากตู้มาโชว์<br>• <strong>Write to PLC:</strong> นำค่าที่เราพิมพ์ใหม่ ส่งกลับไปบันทึกในตู้ควบคุม",
    16: "<strong>หน้าต่างแจ้งเตือน (Alarm):</strong><br>หากเซ็นเซอร์มีปัญหา หรือสายขาด จะมีกรอบสีแดงเด้งเตือนขึ้นมาทันทีเพื่อให้รีบตรวจสอบ",
    17: "<strong>การเคลียร์ Error (Reset):</strong><br>เมื่อซ่อมหน้างานเสร็จแล้ว ต้องมากดปุ่ม <strong>Reset Error</strong> สีส้ม ระบบถึงจะยอมให้วาล์วกลับมาทำงานต่อ",
    18: "<strong>ประวัติปัญหา (Alarm History):</strong><br>ตารางแสดงประวัติว่าเคยเกิดปัญหาอะไรขึ้นบ้าง ตอนกี่โมง พร้อมคำแนะนำเบื้องต้นว่าควรแก้ตรงไหน",
    19: "<strong>การจูนในโหมดจำลอง:</strong><br>ใช้ทดลองปรับค่า Kp, Ti, Td ดูว่ากราฟจำลอง (Simulation) วิ่งนิ่งหรือไม่ ก่อนนำค่าไปใช้จริง",
    20: "<strong>ระบบคำนวณอัตโนมัติ (Auto-Tune):</strong><br>ไม่ต้องเดาตัวเลขเอง! ระบบสามารถคำนวณค่า Kp, Ti, Td ที่เหมาะสมที่สุดมาให้ได้อัตโนมัติ",
    21: "<strong>การนำค่าคำนวณไปใช้ (Apply):</strong><br>เมื่อระบบคำนวณเสร็จแล้ว ให้กดปุ่ม <strong>Apply</strong> ค่าเหล่านั้นจะถูกส่งไปใช้งานจริงทันที",
    22: "<strong>ระบบเก็บข้อมูล (Data Logging):</strong><br>หน้าสำหรับตั้งค่าว่าจะให้เก็บประวัติลง USB ถี่แค่ไหน และเลือกว่าจะลบข้อมูลเก่าทิ้งเมื่อไหร่",
    23: "<strong>การส่งออกข้อมูล (Export CSV):</strong><br>กดปุ่ม <strong>CSV</strong> เพื่อโหลดไฟล์ประวัติการทำงาน เอาไปเปิดด้วย Microsoft Excel ได้ทันที",
    24: "<strong>ตัวอย่างไฟล์ Excel (CSV):</strong><br>ข้อมูลที่โหลดมาจะแสดงเวลา (Timestamp), เป้าหมาย (SP), ค่าจริง (PV) ในทุกๆ วินาที อย่างละเอียด",
    25: "<strong>การสร้างรายงาน (Export PDF):</strong><br>กดปุ่ม <strong>Export Latest to PDF</strong> ระบบจะสร้างไฟล์รายงานสรุปแบบสวยงามให้พร้อมปริ้นท์",
    26: "<strong>การจัดเก็บไฟล์ในระบบ:</strong><br>ไฟล์ประวัติจะถูกแยกเก็บเป็นโฟลเดอร์ตามชื่อของวาล์ว (PID Loop) ทำให้ค้นหาง่ายและไม่ปะปนกัน",
    27: "<strong>การรีสตาร์ท (System Reboot):</strong><br>เมื่อหน้าจอค้าง กด Restart ระบบจะเริ่มใหม่ในไม่กี่วินาที <em>(วาล์วที่ตู้จะยังคงทำงานปกติ ไม่ดับตามหน้าจอ)</em>",
    28: "<strong>การปิดเครื่อง (Power Off):</strong><br><strong>คำเตือน:</strong> หากต้องการตัดไฟตู้ ต้องกด Power Off ที่หน้าจอก่อนเสมอ ห้ามดึงปลั๊กออกทันที เพื่อป้องกันไฟล์พัง",
    29: "<strong>การเปิดเครื่องอัตโนมัติ:</strong><br>เมื่อจ่ายไฟเข้าตู้ หน้าจอจะบูตตัวเองและเปิดโปรแกรมขึ้นมาให้พร้อมใช้งานทันทีโดยไม่ต้องใช้เมาส์คลิก",
    30: "<strong>เลือกวาล์วที่ต้องการบันทึก:</strong><br>ในหน้า Data Logging ให้กดเลือกชื่อ Loop วาล์วที่ต้องการเก็บข้อมูลประวัติ",
    31: "<strong>บันทึกการตั้งค่า (Save Settings):</strong><br>ทุกครั้งที่เปลี่ยนความถี่ในการเก็บข้อมูล หรือตั้งค่า USB ต้องกด <strong>Save Settings</strong> เสมอเพื่อให้ระบบจำ",
    32: "<strong>ระบบลบไฟล์เก่า (Auto-Clear):</strong><br>เลือกตั้งเวลาได้ว่าจะให้ลบไฟล์ที่เก่ากว่า 1, 3, 6 หรือ 12 เดือนทิ้งอัตโนมัติ เพื่อไม่ให้เมมโมรี่เต็ม",
    33: "<strong>ความถี่ในการบันทึก (Stamp Interval):</strong><br>เลือกว่าจะให้ระบบเก็บข้อมูลทุกๆ 1 วินาที หรือ 5 วินาที ยิ่งเก็บถี่ ข้อมูลยิ่งละเอียด แต่อาจเปลืองพื้นที่",
    34: "<strong>ยืนยันการตั้งค่า (Confirm):</strong><br>ตัวอย่างการกดเลือก PID Loop ในช่อง Select Topic อีกครั้งเพื่อยืนยันก่อนเริ่มการส่งออกข้อมูล"
};

function renderImg(id) {
    return `
            <div class="img-block">
                <img src="Khife gatevalve picture/LINE_NOTE_260731_${id}.jpg" onerror="this.parentElement.style.display='none'">
                <div class="img-caption">
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
            --secondary: #0369a1; /* Softer blue */
            --accent: #0ea5e9;
            --text-main: #334155;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --bg: #f0f9ff;
            --warning: #ef4444;
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
        .img-caption { padding: 20px; background: var(--bg); border-left: 5px solid var(--accent); }
        .img-caption strong { color: var(--secondary); font-size: 16px; }
        .img-caption span { color: var(--text-main); font-size: 15px; line-height: 1.7; display: block; margin-top: 8px; }

        .warning-box { background-color: #fef2f2; border-left: 5px solid var(--warning); padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 20px; }
        .warning-box strong { color: var(--warning); font-size: 16px; }

        .btn-print { display: block; width: 250px; margin: 0 auto 30px auto; padding: 16px; background: var(--accent); color: white; text-align: center; text-decoration: none; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 16px; }
        
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
            <div class="cover-title">คู่มือการใช้งานระบบสำหรับผู้ปฏิบัติงาน<br>(Standard User Manual)</div>
            <div class="cover-subtitle">ระบบควบคุมและตรวจสอบ (HMI Gate Valve Control)<br>โครงการ: PIN MILL PLANT GATE VALVE CONTROL</div>
            
            <div class="cover-details">
                <p><strong>ผู้จัดทำ:</strong> ปิยะพงษ์ นวลจันทร์ (Automation Control Engineering)</p>
                <p><strong>เวอร์ชัน:</strong> 4.0 (ปรับปรุงภาษาให้อ่านง่าย ขั้นตอนชัดเจน)</p>
                <p><strong>วันที่อัปเดต:</strong> 31 กรกฎาคม 2026</p>
            </div>
        </div>

        <!-- Table of Contents & Overview -->
        <div class="page page-break">
            <h1 class="section-title">ภาพรวมและสารบัญ (Overview & TOC)</h1>
            <p><strong>ระบบนี้คืออะไร?</strong><br>ระบบนี้คือหน้าจอควบคุมสำหรับสั่งการเปิด-ปิด และหรี่วาล์ว (Gate Valve) แบบอัตโนมัติ (PID) ช่วยให้ Operator ทำงานง่ายขึ้นผ่านหน้าจอสัมผัส โดยสามารถดูกราฟ เก็บประวัติย้อนหลัง และตรวจสอบความผิดปกติได้ทันที</p>
            
            <div class="warning-box">
                <strong>⚠️ ข้อมูลความปลอดภัยและข้อควรระวัง (Safety Warning)</strong>
                <ul>
                    <li>ห้ามดึงปลั๊กไฟหรือสับเบรกเกอร์หน้าจอลงทันที ให้กดปุ่ม <strong>Power Off</strong> ที่หน้าจอก่อนเสมอ เพื่อป้องกันไฟล์ระบบพัง</li>
                    <li>เมื่อวาล์วทำงานโหมด Auto ห้ามเอามือเข้าไปในบริเวณกลไกของวาล์วเด็ดขาด เพราะวาล์วอาจหนีบหรือกระแทกได้ทุกเมื่อ</li>
                    <li>หากเกิดเหตุฉุกเฉิน ให้กดเปลี่ยนโหมดเป็น <strong>Inactive</strong> วาล์วจะหยุดทำงานทันที</li>
                </ul>
            </div>

            <div class="toc">
                <ul>
                    <li><a href="#chap1">1. การเริ่มต้นและเชื่อมต่อระบบ (Getting Started)</a></li>
                    <li><a href="#chap2">2. วิธีการใช้งานหน้าจอหลักทีละขั้นตอน (Step-by-Step Guide)</a></li>
                    <li><a href="#chap3">3. การดูกราฟและการตั้งค่า (Trend & Parameters)</a></li>
                    <li><a href="#chap4">4. การเก็บข้อมูลและการพิมพ์รายงาน (Data Logging)</a></li>
                    <li><a href="#chap5">5. การแก้ไขปัญหาเบื้องต้น (Troubleshooting)</a></li>
                </ul>
            </div>
            ${renderImg(4)}
        </div>

        <!-- Chapter 1 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap1">1. การเริ่มต้นและเชื่อมต่อระบบ (Getting Started)</h1>
            <p>อธิบายขั้นตอนการเปิดเครื่อง การตั้งเวลา และการเชื่อมต่อหน้าจอกับตู้ควบคุม PLC อย่างง่าย</p>
            ${renderImg(29)}
            ${renderImg(11)}
            ${renderImg(8)}
        </div>
        <div class="page page-break">
            ${renderImg(12)}
            ${renderImg(27)}
            ${renderImg(28)}
        </div>

        <!-- Chapter 2 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap2">2. วิธีใช้งานทีละขั้นตอน (Step-by-Step Guide)</h1>
            <p>การเพิ่มวงจรควบคุม และการสั่งงานวาล์วผ่านหน้าจอหลัก</p>
            ${renderImg(6)}
            ${renderImg(13)}
            ${renderImg(14)}
        </div>
        <div class="page page-break">
            ${renderImg(9)}
            ${renderImg(7)}
            ${renderImg(10)}
        </div>

        <!-- Chapter 3 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap3">3. การดูกราฟและการตั้งค่า (Trend & Parameters)</h1>
            <p>หน้าจอสำหรับวิเคราะห์ความนิ่งของระบบ และโหมดสำหรับใช้ฝึกซ้อม (Simulation)</p>
            ${renderImg(1)}
            ${renderImg(2)}
            ${renderImg(15)}
        </div>
        <div class="page page-break">
            ${renderImg(3)}
            ${renderImg(20)}
            ${renderImg(21)}
        </div>

        <!-- Chapter 4 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap4">4. การเก็บข้อมูลและการพิมพ์รายงาน (Data Logging)</h1>
            <p>วิธีการตั้งค่าเพื่อบันทึกประวัติการทำงาน และการดึงไฟล์รายงานออกจากระบบ</p>
            ${renderImg(5)}
            ${renderImg(30)}
            ${renderImg(33)}
        </div>
        <div class="page page-break">
            ${renderImg(31)}
            ${renderImg(23)}
            ${renderImg(24)}
            ${renderImg(25)}
            ${renderImg(26)}
        </div>

        <!-- Chapter 5 -->
        <div class="page page-break">
            <h1 class="section-title" id="chap5">5. การแก้ไขปัญหาเบื้องต้น (Troubleshooting)</h1>
            <p>รวบรวมปัญหาที่พบบ่อย (Alarm) และวิธีแก้คราบอาการเบื้องต้น เพื่อให้หน้างานสามารถแก้ไขและให้ระบบกลับมาเดินต่อได้ไวที่สุด</p>
            ${renderImg(16)}
            ${renderImg(17)}
            ${renderImg(18)}
        </div>

    </div>
</body>
</html>`;

fs.writeFileSync('C:\\Users\\xSixtanic\\Desktop\\User_Manual_Perfect.html', html, 'utf8');
console.log('Perfect manual generated successfully.');
