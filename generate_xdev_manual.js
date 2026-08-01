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

const chapters = [
    {
        title: "บทที่ 1: บทนำ (Introduction)",
        desc: "ภาพรวมของระบบ, ความปลอดภัย และข้อควรระวัง",
        subtopics: ["1.1 ภาพรวมของระบบ", "1.2 ข้อมูลความปลอดภัย (Safety Considerations)"],
        content: `
            <h1 class="chapter-title" id="chap1">บทที่ 1: บทนำ (Introduction)</h1>
            <h3>1.1 ภาพรวมของระบบ</h3>
            <p>ระบบ <strong>Pin Mill Plant Gate Valve Control and Monitoring</strong> ถูกพัฒนาขึ้นเพื่ออำนวยความสะดวกในการควบคุมและติดตามการทำงานของวาล์วภายในโรงงาน โดยมุ่งเน้นที่การทำงานของวงจร <strong>PID (Proportional-Integral-Derivative)</strong> ซึ่งเป็นหัวใจสำคัญในการรักษาระดับการจ่ายวัตถุดิบ (Process Value) ให้นิ่งและเสถียรที่สุด</p>
            <p>แต่เดิม การตั้งค่าและปรับจูนพารามิเตอร์ PID มักจะต้องกระทำผ่านโปรแกรม TIA Portal โดยวิศวกรผู้เชี่ยวชาญเท่านั้น ซึ่งมีความซับซ้อนและใช้เวลา ระบบนี้จึงเข้ามาเป็นตัวกลาง ทำหน้าที่เป็นหน้าจอ Web Application ที่สามารถประมวลผลบนบอร์ด IOT2050 (หรืออุปกรณ์ Edge Controller อื่นๆ) ทำให้ Operator หรือช่างหน้างานสามารถ:</p>
            <ul>
                <li>สั่งการเปลี่ยนโหมด Auto/Manual และตั้งค่า Setpoint ได้ทันทีผ่านหน้าจอสัมผัสหรือคอมพิวเตอร์</li>
                <li>สังเกตการณ์กราฟแนวโน้ม (Trend) แบบ Real-time เพื่อวิเคราะห์ความแม่นยำ (Overshoot, Oscillation) ของระบบ</li>
                <li>เก็บข้อมูลประวัติการทำงาน (Data Logging) แบบ 24/7 เพื่อนำไฟล์ไปทำ Report หรือวิเคราะห์ย้อนหลัง</li>
                <li>รับรู้ถึงความผิดปกติของเซ็นเซอร์และวาล์วได้ทันทีผ่านระบบ Alarm History</li>
            </ul>
            
            <h3 style="margin-top: 20px;">1.2 ข้อมูลความปลอดภัย (Safety Considerations)</h3>
            <div class="alert-box">
                <strong>[!IMPORTANT] ข้อมูลความปลอดภัยและข้อควรระวัง</strong>
                <ul>
                    <li><strong>ห้ามตัดไฟตู้กะทันหัน:</strong> ให้ทำการกดปุ่ม Power Off ที่หน้าจอทุกครั้ง เพื่อให้ระบบปฏิบัติการจัดการบันทึกไฟล์ให้เรียบร้อยก่อนปิดระบบเสมอ</li>
                    <li><strong>ระวังกลไกวาล์ว:</strong> เมื่อระบบอยู่ในโหมด Auto ห้ามนำมือหรือสิ่งของเข้าไปใกล้กลไกการเคลื่อนที่ของวาล์ว เนื่องจากวาล์วอาจขยับอัตโนมัติตลอดเวลา</li>
                    <li><strong>เหตุฉุกเฉิน:</strong> หากพบความผิดปกติรุนแรง ให้เปลี่ยนโหมดเป็น Inactive เพื่อตัดการทำงานทันที</li>
                </ul>
            </div>
        `,
        imgIds: [4]
    },
    {
        title: "บทที่ 2: การเชื่อมต่อกับ PLC และการเริ่มต้นระบบ",
        desc: "PLC Connection, IP Config, Time Sync, System Reboot",
        subtopics: ["2.1 ขั้นตอนการเชื่อมต่อ PLC"],
        content: `
            <h1 class="chapter-title" id="chap2">บทที่ 2: การเชื่อมต่อกับ PLC (PLC Connection)</h1>
            <p>เนื่องจากระบบไม่ได้ยึดติดกับ PLC ตัวใดตัวหนึ่ง การเริ่มต้นใช้งานทุกครั้ง ผู้ใช้จำเป็นต้องระบุที่อยู่เครือข่ายของ PLC ที่ต้องการเชื่อมต่อ โดยระบบสื่อสารผ่านโปรโตคอล S7-Communication (พอร์ต 102)</p>
            <h3>2.1 ขั้นตอนการเชื่อมต่อ PLC</h3>
            <ol>
                <li>ไปที่เมนู <strong>PLC CONNECTION</strong> บริเวณซ้ายบนของหน้าจอ</li>
                <li><strong>IP Address:</strong> กรอกหมายเลข IP ของ PLC (เช่น <code>192.168.121.211</code>)<br><em>หมายเหตุ: ตรวจสอบให้แน่ใจว่าอุปกรณ์หน้าจอ IOT2050 และ PLC อยู่ในวงเครือข่าย (Subnet) เดียวกัน และสามารถปิง (Ping) หากันได้</em></li>
                <li><strong>Rack & Slot:</strong> ระบุตำแหน่งของ CPU บนแร็ค สำหรับ PLC ตระกูล S7-1200 และ S7-1500 โดยมาตรฐานจะใช้ค่า <strong>Rack: 0, Slot: 1</strong> เสมอ</li>
                <li>คลิกปุ่ม <strong>Connect</strong></li>
                <li>หากระบบเชื่อมต่อและดึงข้อมูลสำเร็จ ปุ่มสถานะด้านบนจะเปลี่ยนจากสีเทา ⚪ (Offline) เป็นสีเขียว 🟢 <strong>PLC Connected (LIVE PLC)</strong></li>
                <li>หากเชื่อมต่อไม่สำเร็จ ระบบจะแจ้งเตือน Error สีแดง ให้ตรวจสอบสาย LAN และสถานะการอนุญาต <em>Put/Get Communication</em> ใน TIA Portal</li>
            </ol>
        `,
        imgIds: [8, 11, 12, 27, 28, 29]
    },
    {
        title: "บทที่ 3: การเพิ่มและการตั้งค่า PID Loops",
        desc: "Add Loop, DB Offsets Configuration, PIN Unlock",
        subtopics: ["3.1 การเพิ่ม Loop ใหม่ (Add PID Loop)", "3.2 การตั้งค่า DB Offsets (สำคัญที่สุด!)"],
        content: `
            <h1 class="chapter-title" id="chap3">บทที่ 3: การเพิ่มและการตั้งค่า PID Loops</h1>
            <p>ในโรงงานหนึ่งแห่ง อาจมีวาล์วหลายตัวที่ต้องควบคุม ระบบนี้ออกแบบมาให้รองรับการเชื่อมต่อกับหลายๆ Loop ได้พร้อมกัน (Multi-loop architecture) โดยผู้ใช้สามารถสลับแท็บไปมาเพื่อดูข้อมูลได้โดยไม่ต้องสลับหน้าจอ</p>
            
            <h3>3.1 การเพิ่ม Loop ใหม่ (Add PID Loop)</h3>
            <ol>
                <li>ในส่วนของ <strong>PID LOOPS</strong> ทางฝั่งซ้าย ให้คลิกปุ่ม <strong>+ Add</strong></li>
                <li><strong>Loop Name:</strong> ตั้งชื่อที่สื่อถึงอุปกรณ์หน้างาน เช่น <code>CV-101</code> หรือ <code>TIC-201</code></li>
                <li><strong>DB Number:</strong> ระบุหมายเลข Data Block ใน PLC ที่ใช้เก็บตัวแปรของ PID Loop นี้ (เช่น หากใน TIA Portal ตั้งชื่อบล็อกเป็น DB322 ให้กรอกเลข <code>322</code>)</li>
                <li>หลังจากกดบันทึก แท็บของ Loop ใหม่จะปรากฏขึ้น ผู้ใช้สามารถเพิ่ม Loop ได้ตามจำนวนที่ต้องการ</li>
            </ol>
            
            <h3>3.2 การตั้งค่า DB Offsets (<strong style="color:#d32f2f;">สำคัญที่สุด!</strong>)</h3>
            <p>โปรโตคอล S7-Communication จะดึงข้อมูลจาก PLC ด้วยการอ้างอิง "ตำแหน่ง Byte พื้นฐาน" (Offset) ดังนั้น หากตั้งค่า Offset ผิด ระบบจะดึงตัวเลขผิดพลาด หรืออาจดึงข้าม Address จนทำให้เกิดอาการค้าง/หลุด</p>
            <h4>วิธีตั้งค่า:</h4>
            <ol>
                <li>คลิกที่แท็บของ Loop ที่ต้องการตั้งค่าให้เป็นสีฟ้า (Active Tab)</li>
                <li>คลิกปุ่ม 📁 <strong>DB Offsets</strong> ที่แถบเมนูด้านบนขวา</li>
                <li>เปิดโปรแกรม TIA Portal ควบคู่ไปด้วย และเข้าไปที่หน้าจอ <strong>DB Editor</strong> ของ Data Block นั้นๆ</li>
                <li>ดูที่คอลัมน์ <strong>Offset</strong> ใน TIA Portal แล้วนำตัวเลขหน้าทศนิยมมากรอกในแอปพลิเคชันให้ตรงกับตัวแปรนั้นๆ (เช่น <code>Setpoint</code> อยู่ที่ Offset 20.0 ก็ให้กรอก 20)</li>
                <li><strong>จุดสำคัญเรื่อง ErrorBits:</strong> หากผู้ใช้ใช้งานบล็อก PID_Compact ให้ชี้ Offset ของช่อง <code>errorBits</code> ไปยังตัวแปร <strong>ErrorBits</strong> ซึ่งมีขนาด 32-bit (DWORD) เสมอ (อย่าสับสนกับ Error_Bit ที่เป็น Bool) เพื่อให้ระบบสามารถดึงข้อมูลรายละเอียดข้อผิดพลาดมารายงานผลในหน้า Alarm History ได้อย่างแม่นยำ</li>
                <li>หากตัวแปรบางตัวมีทศนิยม (เช่น Boolean ที่อยู่ตำแหน่ง 182.1) สามารถกรอกตัวเลข <code>182.1</code> ลงในช่องได้เลย ระบบเวอร์ชันล่าสุดรองรับการอ่านจุดทศนิยมแล้ว</li>
                <li>กด <strong>Save Offsets</strong> เมื่อตรวจสอบความถูกต้องครบถ้วน</li>
            </ol>
        `,
        imgIds: [6, 13, 14]
    },
    {
        title: "บทที่ 4: หน้าควบคุมหลัก (Dashboard & Controls)",
        desc: "Dashboard Overview, Control Modes, Quick Setpoint",
        subtopics: ["4.1 ส่วนประกอบของ Dashboard", "4.2 การแสดงสถานะ PID Loop"],
        content: `
            <h1 class="chapter-title" id="chap4">บทที่ 4: หน้าควบคุมหลัก (Dashboard & Controls)</h1>
            <p>เมื่อตั้งค่า Offset ถูกต้องและระบบกำลัง LIVE ข้อมูลจะถูกอ่านจาก PLC ทุกๆ 0.5 วินาที (500ms) และนำมาแสดงผลแบบ Real-time</p>
            
            <h3>4.1 ส่วนประกอบของ Dashboard</h3>
            <ul>
                <li><strong>โหมดการทำงานของวาล์ว (PID Mode):</strong>
                    <ul>
                        <li>⏹️ <strong>Inactive:</strong> ปิดการทำงาน (Output = 0%) นิยมใช้เมื่อต้องการหยุดพักเครื่องจักร</li>
                        <li>▶️ <strong>Auto:</strong> โหมดอัตโนมัติ บล็อก PID จะคำนวณและสั่งการเปิด/ปิดวาล์วด้วยตัวเอง เพื่อให้ค่า PV วิ่งเข้าหาค่า SP ให้เร็วและนิ่งที่สุด</li>
                        <li>✋ <strong>Manual:</strong> โหมดควบคุมด้วยมือ ผู้ใช้งานสามารถแทรกแซงระบบเพื่อสั่งเปอร์เซ็นต์การเปิดวาล์วด้วยตนเอง เหมาะสำหรับช่วงเวลาทดสอบหรือแก้ไขปัญหาหน้างาน</li>
                    </ul>
                </li>
                <li><strong>จอแสดงผลหลัก (Live Preview):</strong>
                    <ul>
                        <li><strong>Setpoint (SP):</strong> ค่าเป้าหมายที่ต้องการให้ระบบทำได้ (หน่วยเป็น Amp, บาร์, องศาเซลเซียส ฯลฯ)</li>
                        <li><strong>Process Value (PV):</strong> ค่าจริงที่อ่านได้จากเซ็นเซอร์หน้างาน ณ วินาทีนั้น</li>
                        <li><strong>Output (%):</strong> สัดส่วนการสั่งงานไปยังวาล์ว หรือมอเตอร์ (0-100%)</li>
                    </ul>
                </li>
                <li><strong>Quick Setpoint:</strong> บริเวณซ้ายล่าง ผู้ใช้สามารถพิมพ์ตัวเลขเป้าหมายใหม่แล้วกดปุ่ม <strong>Set</strong> เพื่อส่งค่า SP ลงไปยัง PLC แบบทันที โดยไม่ต้องรอให้เปิด TIA Portal</li>
            </ul>

            <h3>4.2 การแสดงสถานะ PID Loop</h3>
            <p>สังเกตสถานะการทำงานผ่านจุดสีที่อยู่หน้าชื่อ Loop แต่ละตัว เพื่อให้รู้ทันทีว่าลูปนั้นอยู่ในโหมดใด</p>
            <ul>
                <li><strong style="color: #22c55e;">🟢 สีเขียว (Auto):</strong> วาล์วกำลังถูกควบคุมแบบอัตโนมัติด้วยระบบ PID</li>
                <li><strong style="color: #ef4444;">🔴 สีแดง (Manual):</strong> วาล์วกำลังถูกควบคุมแบบแมนนวล (ผู้ใช้สั่งเปิด-ปิดเป็นเปอร์เซ็นต์เอง)</li>
                <li><strong style="color: #64748b;">⚪ สีเทา (Inactive):</strong> วงจรถูกปิดการทำงานชั่วคราว วาล์วจะไม่มีการขยับใดๆ</li>
            </ul>
        `,
        imgIds: [9, 7, 10]
    },
    {
        title: "บทที่ 5: กราฟและพารามิเตอร์ (Trend & Parameters)",
        desc: "Real-time Trend, PID Tuning, Write to PLC",
        subtopics: ["5.1 แท็บ Trend (วิเคราะห์กราฟแนวโน้ม)", "5.2 แท็บ Parameters (พารามิเตอร์และการจูน)"],
        content: `
            <h1 class="chapter-title" id="chap5">บทที่ 5: กราฟและพารามิเตอร์ (Trend & Parameters)</h1>
            <h3>5.1 แท็บ Trend (วิเคราะห์กราฟแนวโน้ม)</h3>
            <p>กราฟถูกออกแบบมาเพื่อใช้วิเคราะห์พฤติกรรมของการควบคุม (Control Behavior) แบบสดๆ โดยเส้นสีฟ้าแทน Setpoint, สีเขียวแทน PV, และสีส้มแทน Output%</p>
            <ul>
                <li>ผู้ใช้สามารถใช้กราฟเพื่อดูว่าระบบมีอาการ <strong>Overshoot</strong> (ค่าพุ่งเกินเป้าหมายมากไป) หรือ <strong>Oscillation</strong> (ค่าแกว่งไปมาไม่ยอมนิ่ง) หรือไม่</li>
                <li>ที่มุมขวาบน จะมี Dropdown ให้เลือก <strong>Chart Window</strong> เพื่อขยายหรือหดช่วงเวลาแกน X (เช่น ดูย้อนหลัง 1 นาที หรือ 5 นาที) เพื่อให้เห็นแนวโน้มระยะยาว</li>
                <li>หากวิศวกรต้องการนำข้อมูลกราฟที่แสดงอยู่ไปทำรายงาน สามารถกดปุ่ม <strong>Export CSV</strong> ข้อมูลบนกราฟทั้งหมดจะถูกดึงออกมาเป็นไฟล์ Excel ให้ทันที</li>
            </ul>
            
            <h3>5.2 แท็บ Parameters (พารามิเตอร์และการจูน)</h3>
            <p>สำหรับวิศวกรที่ต้องการปรับจูนพฤติกรรมการตอบสนองของระบบ สามารถดำเนินการได้ผ่านแท็บนี้ โดยไม่ต้องกังวลเรื่องการคำนวณ Address ใน PLC</p>
            <ul>
                <li><strong>Proportional Gain (Kp):</strong> ความรุนแรงในการตอบสนอง ถ้าน้อยไประบบจะเข้าเป้าช้า ถ้ามากไปจะแกว่ง</li>
                <li><strong>Integration Time (Ti):</strong> เวลาในการสะสม Error เพื่อกำจัดความคลาดเคลื่อนที่คงค้าง (Steady-state error)</li>
                <li><strong>Derivative Time (Td):</strong> การเบรกของระบบเมื่อเข้าใกล้เป้าหมาย เพื่อป้องกันการทะลุเป้า (Overshoot)</li>
                <li><strong>Limits:</strong> ใช้ในการจำกัดค่าสูงสุด/ต่ำสุด ทั้งในส่วนของสัญญาณขาเข้า (PV Limits) และสัญญาณคำสั่งขาออก (Output Limits) เพื่อความปลอดภัยของเครื่องจักร</li>
                <li>หลังจากปรับตัวเลขในช่องเสร็จสิ้น ต้องกดปุ่ม <strong>Write to PLC</strong> เพื่อส่งค่าชุดใหม่ทับค่าเดิมใน PLC</li>
            </ul>
        `,
        imgIds: [1, 2, 15]
    },
    {
        title: "บทที่ 6: ระบบบันทึกข้อมูล (Data Logging)",
        desc: "Logging Config, USB Mount, CSV Export, PDF Report",
        subtopics: ["6.1 ขั้นตอนการตั้งค่าเก็บบันทึก", "6.2 การตั้งค่าและจัดการลูป"],
        content: `
            <h1 class="chapter-title" id="chap6">บทที่ 6: ระบบบันทึกข้อมูล (Data Logging)</h1>
            <p>เป็นฟีเจอร์ที่สำคัญมากในการตรวจสอบคุณภาพและการทำงานย้อนหลัง ระบบนี้ถูกออกแบบโครงสร้างสถาปัตยกรรม (Architecture) ให้สามารถประมวลผลการจัดเก็บข้อมูลตลอด 24 ชั่วโมง โดยไม่ทำให้หน่วยความจำ (RAM) เต็มหรือเครื่องค้าง (Zero Memory Leak)</p>
            
            <h3>6.1 ขั้นตอนการตั้งค่าเก็บบันทึก</h3>
            <ol>
                <li>ไปที่แท็บ <strong>Data Logging</strong> บริเวณเมนูกลางหน้าจอ</li>
                <li>ในช่อง <strong>Select Topic</strong> ให้เลือก Loop ที่ต้องการจะเริ่มบันทึก</li>
                <li><strong>Stamp Interval (ความถี่):</strong> เลือกว่าจะให้ระบบพิมพ์ข้อมูลลงไฟล์ทุกๆ กี่วินาที (แนะนำที่ 1 วินาที หรือ 5 วินาที สำหรับวาล์วทั่วไป)</li>
                <li><strong>Auto-Clear History:</strong> เป็นฟังก์ชันป้องกันความจุจัดเก็บเต็ม ระบบจะแอบตรวจสอบหลังบ้านทุกๆ ชั่วโมง หากพบว่าไฟล์เก่ากว่าเวลาที่กำหนด (เช่น เก่ากว่า 1 เดือน) ระบบจะทำการลบทิ้งอัตโนมัติ</li>
                <li><strong>Storage Location Path:</strong>
                    <ul>
                        <li>เพื่อความปลอดภัยของข้อมูล แนะนำให้เสียบ <strong>USB Flash Drive (ฟอร์แมต FAT32)</strong> เข้าที่ช่อง USB ของ IOT2050</li>
                        <li>เมื่อเสียบแล้ว ให้กดปุ่ม <strong>🔍 Scan USB</strong> ทางด้านขวา ระบบจะค้นหาตำแหน่งเมานท์ (เช่น <code>/media/usb</code>) และกรอกลงช่องให้อัตโนมัติ</li>
                        <li>หากขึ้นเตือนว่าหาไม่พบ อาจเกิดจากบอร์ดไม่ได้ทำ Auto-mount หรือแฟลชไดร์ฟไม่ได้ฟอร์แมตเป็น FAT32</li>
                    </ul>
                </li>
                <li>เมื่อพร้อมแล้ว กด <strong>Save Settings</strong> ระบบบอทหลังบ้าน (Background Task) จะเริ่มเขียนไฟล์ลง USB ทันที โดยแยกไฟล์รายวันให้อัตโนมัติ ขนาดไฟล์จะอยู่ที่ประมาณ 8-10 MB ต่อวันเท่านั้น</li>
            </ol>

            <h3>6.2 การตั้งค่าและจัดการลูปเพิ่มเติม</h3>
            <p>ระบบรองรับการเปิด-ปิดการเก็บบันทึกข้อมูลราย Loop ได้อย่างอิสระ ผู้ใช้สามารถตั้งค่าให้บันทึกเฉพาะ Loop ที่กำลังเดินเครื่องผลิตอยู่ได้</p>
        `,
        imgIds: [5, 22, 30, 33, 32, 31, 23, 24, 25, 26]
    },
    {
        title: "บทที่ 7: ประวัติการแจ้งเตือน (Alarm History)",
        desc: "Alarm Notifications, Error Reset, Troubleshooting",
        subtopics: ["7.1 การทำงานของระบบ Alarm", "7.2 ตารางรหัสแจ้งเตือนและวิธีแก้ไข"],
        content: `
            <h1 class="chapter-title" id="chap7">บทที่ 7: ประวัติการแจ้งเตือน (Alarm History)</h1>
            <p>ระบบติดตามความผิดปกติ ถูกออกแบบมาเพื่อช่วยเหลือช่างซ่อมบำรุงหน้างาน (Maintenance) เมื่อเครื่องจักรมีปัญหา โดยไม่ต้องพึ่งพาวิศวกรโปรแกรมเมอร์</p>
            
            <h3>7.1 การทำงานของระบบ Alarm</h3>
            <ul>
                <li>เมื่อค่าของระบบ (เช่น PV) หลุดขอบเขตความปลอดภัย หรือสายสัญญาณขาด บล็อก <code>PID_Compact</code> ของ Siemens จะคายรหัส <strong>ErrorBits</strong> ออกมา</li>
                <li>แอปพลิเคชันจะดักจับรหัสนี้ (เช่น <code>16#0001</code>) นำมาแปลความหมายเป็นภาษาคน และแสดงแบนเนอร์สีแดง 🚨 ทันที พร้อมกับไฟสถานะของ Loop ทางซ้ายมือจะเปลี่ยนเป็นสีแดงเพื่อดึงดูดความสนใจ</li>
                <li>ประวัติเหล่านี้จะถูกบันทึกไว้ในตาราง <strong>ALARM HISTORY</strong> ที่ด้านล่างของหน้า Dashboard </li>
                <li>หลังจากช่างหน้างานแก้ปัญหาทางกายภาพเสร็จแล้ว ระบบจะยังคงล็อกสถานะ Error ไว้เพื่อความปลอดภัย ผู้ใช้งานจำเป็นต้องกดยืนยันการรับทราบที่ปุ่ม <strong>Reset Ack</strong> บนแบนเนอร์ ระบบถึงจะสั่งปลดล็อกให้ PLC กลับมาทำงานปกติ</li>
            </ul>
        `,
        alarmTable: `
            <h3>7.2 ตารางรหัสแจ้งเตือน (Error Bits) และวิธีแก้ไข (Troubleshooting)</h3>
            <p>แอปพลิเคชันจะทำการแปลรหัสแบบเจาะลึก 32-bit (DWORD) จากบล็อก PID_Compact ออกมาเป็นข้อความและวิธีแก้ไขดังนี้:</p>
            <table class="content-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">รหัส (Hex)</th>
                        <th style="width: 25%;">ข้อความแจ้งเตือน (Alarm)</th>
                        <th style="width: 60%;">สาเหตุและวิธีแก้ไขเบื้องต้น (Troubleshooting / Fix)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td><strong>16#0001</strong></td><td><strong>PV out of limits</strong></td><td>ค่า Process Value (PV) ทะลุขีดจำกัดที่ตั้งไว้ในพารามิเตอร์<br><strong>วิธีแก้:</strong> ให้ตรวจสอบค่า InputLowerLimit, InputUpperLimit ว่าตั้งแคบไปหรือไม่ หรือตรวจสอบเซ็นเซอร์หน้างาน</td></tr>
                    <tr><td><strong>16#0002</strong></td><td><strong>Input_PER out of limits</strong></td><td>สัญญาณ Analog ขาเข้า (4-20mA หรือ 0-10V) ผิดปกติ ทะลุสเกล<br><strong>วิธีแก้:</strong> ตรวจสอบการตั้งค่าสเกลของ Input_PER และเช็คกระแสที่สายสัญญาณ</td></tr>
                    <tr><td><strong>16#0004</strong></td><td><strong>Wire break</strong></td><td>สายเซ็นเซอร์ขาด หรือไม่มีสัญญาณวงจรไฟฟ้าตอบกลับจากหน้างาน<br><strong>วิธีแก้:</strong> ให้ตรวจสอบการเข้าสายที่จุดเทอร์มินอลของการ์ด Analog Input</td></tr>
                    <tr><td><strong>16#0008</strong></td><td><strong>Error during tuning</strong></td><td>เกิดข้อผิดพลาดขณะระบบกำลังพยายามหาค่า Kp, Ti, Td (Auto-tuning)<br><strong>วิธีแก้:</strong> ให้เปลี่ยนกลับเป็นโหมด Manual แล้วเพิ่ม Step size ชั่วคราว</td></tr>
                    <tr><td><strong>16#0010</strong></td><td><strong>Invalid parameters</strong></td><td>ค่าพารามิเตอร์เชิงลึก (Gain, Ti, Td) มีค่าเป็น 0<br><strong>วิธีแก้:</strong> ให้ใส่ค่าเริ่มต้น (Kp=1.0, Ti=10) แล้วกด Write to PLC ในแท็บ Parameters</td></tr>
                    <tr><td><strong>16#0020</strong></td><td><strong>Invalid Setpoint</strong></td><td>ค่าเป้าหมายที่สั่งการไป เกินขอบเขตความปลอดภัยที่กำหนด<br><strong>วิธีแก้:</strong> ให้เช็คว่าค่า Setpoint อยู่ระหว่าง SP Lower และ SP Upper หรือไม่</td></tr>
                    <tr><td><strong>16#0040</strong></td><td><strong>Invalid output limits</strong></td><td>การตั้งค่าขีดจำกัดเปอร์เซ็นต์วาล์วผิดพลาด<br><strong>วิธีแก้:</strong> ค่า OutputUpperLimit ต้องมีค่ามากกว่า OutputLowerLimit เสมอ</td></tr>
                    <tr><td><strong>16#0080</strong></td><td><strong>Sampling time error</strong></td><td>เวลาในการสุ่มประมวลผล (Cycle time) ของ PLC ผิดพลาด<br><strong>วิธีแก้:</strong> ตรวจสอบใน TIA Portal ว่าเรียกใช้ PID_Compact ภายใน Cyclic Interrupt Block แล้วหรือไม่</td></tr>
                    <tr><td><strong>16#10000</strong></td><td><strong>Pre-tuning failed</strong></td><td>การเริ่มจูนล้มเหลว เนื่องจากค่า PV ปัจจุบันอยู่ใกล้เป้าหมายเกินไป<br><strong>วิธีแก้:</strong> ปรับสั่ง Manual ให้วาล์วขยับดึงค่า PV ออกห่างจาก SP อย่างน้อย 10-20% ก่อนสั่งจูนใหม่</td></tr>
                    <tr><td><strong>16#20000</strong></td><td><strong>Fine tuning failed</strong></td><td>การจูนแบบละเอียดล้มเหลว<br><strong>วิธีแก้:</strong> ระบบไม่สามารถจับ Oscillation ได้ อาจต้องใช้วิธี Manual Tuning แทน</td></tr>
                </tbody>
            </table>
        `,
        imgIds: [16, 17, 18]
    },
    {
        title: "บทที่ 8: โหมดจำลอง (Simulation Mode)",
        desc: "FOPDT Simulation, Auto-Tuning, Apply Parameters",
        subtopics: ["8.1 วิธีการเข้าสู่โหมดจำลอง"],
        content: `
            <h1 class="chapter-title" id="chap8">บทที่ 8: โหมดจำลอง (Simulation Mode)</h1>
            <p>ในบางครั้ง ผู้ใช้งานอาจต้องการทดสอบระบบ (เช่น ทดสอบฟีเจอร์ Data Logging ว่าบันทึกติดลง USB หรือไม่, หรือฝึกให้พนักงานลองตั้งค่ากราฟ) แต่ไม่สามารถเชื่อมต่อกับ PLC ของจริงที่กำลังคุมเครื่องจักรได้ ระบบนี้จึงมี <strong>โหมดจำลอง (Simulation)</strong> ใส่เข้ามาให้ด้วย</p>
            
            <h3>8.1 วิธีการเข้าสู่โหมดจำลอง</h3>
            <ol>
                <li>ไปที่เมนู PLC CONNECTION ทางซ้ายมือ แล้วกดปุ่ม <strong>Disconnect</strong> เพื่อตัดการเชื่อมต่อจากของจริง</li>
                <li>ปุ่มสีเหลือง 🧪 <strong>Start Simulation</strong> จะทำงาน ให้คลิกเพื่อเข้าสู่โหมดจำลอง</li>
                <li>ระบบหลังบ้านจะตัดการรับส่งข้อมูลผ่าน S7-Protocol แล้วเปลี่ยนไปใช้ฟังก์ชันคณิตศาสตร์ (Sine Wave) สร้างคลื่นจำลองของค่า PV ขึ้นมาแทน</li>
                <li>กราฟ Trend จะเริ่มวิ่ง และระบบ Data Logging จะสามารถบันทึกค่าลง CSV ได้เสมือนต่อกับเครื่องจักรจริงทุกประการ ผู้ใช้สามารถกดปุ่มหยุดได้ทุกเมื่อที่ต้องการ</li>
            </ol>
        `,
        imgIds: [3, 19, 20, 21]
    }
];

function renderImg(id) {
    if (!id) return '';
    return `
            <div class="img-block">
                <img src="Khife gatevalve picture/LINE_NOTE_260731_${id}.jpg" onerror="this.parentElement.style.display='none'">
                <div class="img-caption">
                    <strong>ภาพประกอบที่ ${id}:</strong>
                    <span>${images[id]}</span>
                </div>
            </div>`;
}

let pages = [];
let tocData = [];
let currentPageNo = 1;

function wrapPage(content) {
    return `
        <div class="page">
            <div class="doc-header">
                <span>คู่มือมาตรฐาน Gate Valve Control — Mitr Phol | MAN-PRD-GVC-MASTER-001 Rev.01</span>
                <span>หน้า {PAGE_NO} / {TOTAL_PAGES}</span>
            </div>
            <div class="page-body">
                ${content}
            </div>
            <div class="doc-footer">
                <span class="f-left">จัดทำโดย: xDev.CO,LTD</span>
                <span class="f-center">MAN-PRD-GVC-MASTER-001 | 31 กรกฎาคม 2026</span>
                <span class="f-right">ลูกค้า: บริษัท มิตรผล จำกัด</span>
            </div>
        </div>
    `;
}

// 1. Cover Page (NO header, NO footer)
pages.push(`
    <div class="page cover-page">
        <img src="logo.png" alt="xDev Logo" style="height: 90px; margin-top: 50px; margin-bottom: 20px;" onerror="this.outerHTML='<div class=\\'xdev-logo\\'>xDev</div>'">
        <div class="cover-type">STANDARD OPERATING PROCEDURE / WORK INSTRUCTION</div>
        <div class="cover-title">คู่มือมาตรฐานการใช้งาน<br>และเอกสารทางเทคนิค</div>
        <div class="cover-subtitle">User &amp; Operator Manual + Technical Reference</div>
        <div class="cover-project">ระบบควบคุมกระบวนการ <strong>Gate Valve Control</strong></div>
        <div class="cover-line"></div>
        <table class="cover-table">
            <tr><td>รหัสเอกสาร</td><td>MAN-PRD-GVC-MASTER-001</td></tr>
            <tr><td>Revision</td><td>01 — Master Edition</td></tr>
            <tr><td>วันที่บังคับใช้</td><td>31 กรกฎาคม 2026</td></tr>
            <tr><td>จัดทำโดย</td><td class="blue-text">xDev.CO,LTD</td></tr>
            <tr><td>ลูกค้า (Client)</td><td>บริษัท มิตรผล จำกัด</td></tr>
        </table>
    </div>
`);
currentPageNo++;

// 2. TOC Page Placeholder
let tocPageIndex = pages.length;
pages.push(""); 
currentPageNo++;

// 3. Chapters
chapters.forEach((chap, idx) => {
    tocData.push({
        title: chap.title,
        desc: chap.desc,
        subtopics: chap.subtopics || [],
        startPage: currentPageNo
    });

    // Main chapter text page
    pages.push(wrapPage(chap.content));
    currentPageNo++;

    // Alarm table page if exists
    if (chap.alarmTable) {
        pages.push(wrapPage(chap.alarmTable));
        currentPageNo++;
    }

    // Images pages (at most 2 images per page so nothing ever overflows)
    let currentImgs = "";
    let count = 0;
    chap.imgIds.forEach((imgId) => {
        currentImgs += renderImg(imgId);
        count++;
        if (count >= 2) {
            pages.push(wrapPage(currentImgs));
            currentPageNo++;
            currentImgs = "";
            count = 0;
        }
    });

    if (currentImgs.trim() !== "") {
        pages.push(wrapPage(currentImgs));
        currentPageNo++;
    }
});

// Pass 2: Generate TOC Content
let tocRows = "";
tocData.forEach((item, idx) => {
    let subList = "";
    if (item.subtopics && item.subtopics.length > 0) {
        subList = `<ul class="toc-subtopics">`;
        item.subtopics.forEach(sub => {
            subList += `<li>${sub}</li>`;
        });
        subList += `</ul>`;
    }

    tocRows += `
        <tr>
            <td class="col-chapter">บทที่ ${idx + 1}</td>
            <td class="col-desc">
                <strong>${item.title.split(':')[1].trim()}</strong>
                <span>${item.desc}</span>
                ${subList}
            </td>
            <td class="col-page">${item.startPage}</td>
        </tr>
    `;
});

let tocContent = `
    <h1 class="chapter-title">สารบัญ (Table of Contents)</h1>
    <table class="toc-table">
        <thead>
            <tr>
                <th style="text-align:center;">บทที่</th>
                <th>รายละเอียด</th>
                <th style="text-align:center; width: 10%;">หน้า</th>
            </tr>
        </thead>
        <tbody>
            ${tocRows}
        </tbody>
    </table>
`;
pages[tocPageIndex] = wrapPage(tocContent);

// Pass 3: Assemble HTML
let totalPages = pages.length;
let finalHtml = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>คู่มือมาตรฐาน Gate Valve Control - xDev</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        
        :root {
            --primary: #00338d; /* xDev Navy Blue */
            --accent: #ffc000; /* xDev Yellow/Gold */
            --text-main: #333333;
            --text-muted: #666666;
            --border: #e0e0e0;
            --bg-light: #f8f9fa;
        }

        * { box-sizing: border-box; }

        body { font-family: 'Sarabun', sans-serif; line-height: 1.6; color: var(--text-main); background-color: #525659; margin: 0; padding: 20px 0; font-size: 14px; }
        .document { width: 210mm; margin: 0 auto; }

        /* Dedicated A4 Page Container */
        .page {
            width: 210mm;
            height: 297mm;
            background: white;
            margin: 0 auto 30px auto;
            padding: 12mm 18mm 10mm 18mm;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
            page-break-after: always;
            page-break-inside: avoid;
        }

        .page-body {
            flex: 1;
            overflow: hidden;
            padding: 10px 0;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }

        /* Cover Page */
        .cover-page {
            align-items: center;
            text-align: center;
            justify-content: center;
            padding: 20mm 20mm;
        }
        .xdev-logo { background: var(--accent); color: #cc0000; font-weight: 800; font-size: 50px; padding: 10px 35px; border-bottom: 6px solid var(--primary); margin-top: 40px; letter-spacing: 2px; }
        .cover-type { color: #888; font-size: 13px; letter-spacing: 2px; margin-top: 25px; text-transform: uppercase; font-weight: 500; }
        .cover-title { font-size: 32px; font-weight: 700; color: var(--primary); margin-top: 15px; margin-bottom: 10px; line-height: 1.3; }
        .cover-subtitle { font-size: 16px; color: var(--text-main); margin-bottom: 15px; font-weight: 400; }
        .cover-project { font-size: 16px; color: var(--text-muted); font-weight: 500; }
        .cover-line { width: 100%; height: 4px; background: linear-gradient(to right, var(--primary) 50%, var(--accent) 50%); margin: 30px 0; }
        .cover-table { width: 85%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
        .cover-table td { border: 1px solid var(--border); padding: 10px 18px; text-align: center; }
        .cover-table td:first-child { font-weight: 600; background: var(--bg-light); text-align: right; width: 40%; color: var(--text-main); }
        .cover-table td:last-child { text-align: left; color: var(--text-muted); }
        .cover-table td.blue-text { color: var(--primary); font-weight: 600; }

        /* Header / Footer */
        .doc-header { border-bottom: 2px solid var(--primary); padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; font-size: 10px; color: var(--primary); font-weight: 600; flex-shrink: 0; }
        .doc-footer { border-top: 1px solid var(--border); padding-top: 6px; margin-top: auto; display: flex; justify-content: space-between; font-size: 10px; color: #666; flex-shrink: 0; }
        .f-left { color: var(--primary); font-weight: 600; }
        .f-center { color: #888; }
        .f-right { color: #666; }

        /* Headings */
        h1, h2, h3, h4 { color: var(--primary); font-weight: 700; margin-top: 15px; margin-bottom: 10px; }
        h1.chapter-title { font-size: 22px; border-bottom: 3px solid var(--accent); padding-bottom: 6px; margin-top: 0; margin-bottom: 15px; }
        h2 { font-size: 18px; }
        h3 { font-size: 15px; }
        
        p, li { margin-bottom: 8px; text-align: justify; }
        ul, ol { padding-left: 20px; margin-top: 4px; margin-bottom: 10px; }

        /* Tables */
        table.content-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
        table.content-table th, table.content-table td { border: 1px solid var(--border); padding: 7px 10px; vertical-align: top; }
        table.content-table th { background-color: var(--primary); color: white; font-weight: 600; text-align: left; }
        table.content-table tr:nth-child(even) { background-color: #f8f9fa; }

        /* Image Blocks */
        .img-block { border: 1px solid var(--border); margin: 10px 0; background: white; border-radius: 4px; overflow: hidden; }
        .img-block img { width: 100%; max-height: 180px; object-fit: contain; display: block; border-bottom: 1px solid var(--border); background: #f9f9f9; }
        .img-caption { padding: 8px 12px; font-size: 12px; }
        .img-caption strong { color: var(--primary); display: block; margin-bottom: 2px; font-size: 11px; }

        /* Alert/Warning Boxes */
        .alert-box { border-left: 4px solid #d32f2f; background-color: #fde8e8; padding: 12px; margin: 10px 0; font-size: 13px; }
        .alert-box strong { color: #d32f2f; display: block; margin-bottom: 4px; }

        /* Table of Contents */
        .toc-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
        .toc-table th { border: 1px solid var(--border); padding: 8px; background: var(--primary); color: white; }
        .toc-table td { padding: 10px 12px; border: 1px solid var(--border); vertical-align: top; }
        .toc-table td.col-chapter { width: 15%; font-weight: 700; color: var(--primary); background: var(--bg-light); text-align: center; }
        .toc-table td.col-desc { color: var(--text-main); }
        .toc-table td.col-desc strong { display: block; color: var(--text-main); font-weight: 600; margin-bottom: 2px; }
        .toc-table td.col-desc span { color: var(--text-muted); font-size: 12px; }
        .toc-table td.col-page { text-align: center; font-weight: bold; color: var(--primary); font-size: 14px; vertical-align: middle; }
        ul.toc-subtopics { margin-top: 4px; margin-bottom: 0; padding-left: 18px; font-size: 12px; color: #555; list-style-type: circle; }

        .btn-print { display: block; width: 250px; margin: 0 auto 20px auto; padding: 14px; background: var(--primary); color: white; text-align: center; text-decoration: none; border-radius: 4px; font-weight: 600; cursor: pointer; border: none; font-size: 15px; }
        .btn-print:hover { background: #002266; }

        @media print {
            @page {
                size: A4 portrait;
                margin: 0;
            }
            body { background: white; margin: 0; padding: 0; }
            .document { width: 210mm; margin: 0; }
            .btn-print { display: none; }

            .page {
                width: 210mm;
                height: 297mm;
                margin: 0;
                box-shadow: none;
                page-break-after: always;
                page-break-inside: avoid;
                overflow: hidden;
            }
        }
    </style>
</head>
<body>
    <button class="btn-print" onclick="window.print()">🖨️ พิมพ์เอกสาร (Save as PDF)</button>
    <div class="document">
`;

pages.forEach((pageContent, idx) => {
    let finalPageContent = pageContent
        .replace(/{PAGE_NO}/g, idx + 1)
        .replace(/{TOTAL_PAGES}/g, totalPages);
    finalHtml += finalPageContent;
});

finalHtml += `
    </div>
</body>
</html>`;

fs.writeFileSync('C:\\Users\\xSixtanic\\Desktop\\User_Manual_xDev.html', finalHtml, 'utf8');
console.log(`xDev manual generated successfully with ${totalPages} pages.`);
