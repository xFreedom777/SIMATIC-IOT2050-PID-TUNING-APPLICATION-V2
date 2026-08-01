const fs = require('fs');

let html = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Manual - GATE VALVE CONTROL</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Sarabun', sans-serif; line-height: 1.8; color: #334155; background-color: #e2e8f0; margin: 0; padding: 40px 20px; }
        .document { max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .page { padding: 25mm; min-height: 297mm; box-sizing: border-box; position: relative; }
        .page-break { page-break-after: always; border-bottom: 1px dashed #ccc; margin-bottom: 40px; }
        h1, h2, h3 { color: #0f172a; font-weight: 600; }
        h1.section-title { font-size: 28px; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-top: 0; margin-bottom: 30px; }
        .cover-page { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 297mm; }
        .cover-title { font-size: 36px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }
        .cover-subtitle { font-size: 20px; color: #1e3a8a; margin-bottom: 60px; font-weight: 500; }
        .img-block { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 30px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .img-block img { max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #cbd5e1; }
        .img-block .caption { margin-top: 15px; background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; font-size: 15px; }
        .btn-print { display: block; width: 250px; margin: 0 auto 30px auto; padding: 16px; background: #2563eb; color: white; text-align: center; text-decoration: none; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 16px; }
        @media print {
            body { background: white; margin: 0; padding: 0; }
            .document { box-shadow: none; max-width: 100%; width: 100%; margin: 0; }
            .page-break { page-break-after: always; border-bottom: none; margin-bottom: 0; }
            .btn-print { display: none; }
            .page { padding: 20mm; min-height: auto; }
            .img-block { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <button class="btn-print" onclick="window.print()">🖨️ พิมพ์เอกสาร (Save as PDF)</button>
    <div class="document">
        
        <div class="page cover-page page-break">
            <div class="cover-title">คู่มือการใช้งานระบบ<br>(User Manual - Visual Guide)</div>
            <div class="cover-subtitle">โครงการ: GATE VALVE CONTROL AND MONITORING PROJECT<br>พื้นที่: PIN MILL PLANT</div>
            <p><strong>เวอร์ชัน (Version):</strong> 3.0 (ฉบับสมบูรณ์พร้อมภาพประกอบ)</p>
        </div>

        <div class="page">
            <h1 class="section-title">คำอธิบายการทำงานทุกหน้าจอ (Full Visual Guide)</h1>
            <p>เอกสารส่วนนี้รวบรวมภาพประกอบทั้งหมด 34 ภาพจากระบบจริง เพื่ออธิบายการทำงานของแต่ละปุ่มและสถานะอย่างละเอียด</p>
`;

for (let i = 1; i <= 34; i++) {
    html += `
            <div class="img-block">
                <img src="Khife gatevalve picture/LINE_NOTE_260731_${i}.jpg" onerror="this.parentElement.style.display='none'">
                <div class="caption" contenteditable="true">
                    <strong>ภาพประกอบที่ ${i}:</strong> <br>
                    <strong>คำอธิบาย (คลิกเพื่อแก้ไขข้อความได้):</strong> กดปุ่มในหน้านี้จะส่งผลให้... (อธิบายการทำงานของระบบ)
                </div>
            </div>`;
}

html += `
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync('C:\\Users\\xSixtanic\\Desktop\\User_Manual.html', html, 'utf8');
console.log('Generated successfully');
