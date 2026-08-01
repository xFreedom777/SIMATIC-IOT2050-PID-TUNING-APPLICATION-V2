const fs = require('fs');
const path = require('path');

const htmlPath = 'C:\\Users\\xSixtanic\\Desktop\\User_Manual_xDev.html';
const outputPath = 'C:\\Users\\xSixtanic\\Desktop\\User_Manual_xDev_embedded.html';
const baseDir = 'C:\\Users\\xSixtanic\\Desktop';

let html = fs.readFileSync(htmlPath, 'utf8');

// Embed logo.png
const logoPath = path.join(baseDir, 'logo.png');
if (fs.existsSync(logoPath)) {
    const logoData = fs.readFileSync(logoPath).toString('base64');
    html = html.replace(/src="logo\.png"/g, `src="data:image/png;base64,${logoData}"`);
    console.log('✓ Embedded logo.png');
}

// Embed all LINE_NOTE images
const picDir = path.join(baseDir, 'Khife gatevalve picture');
let imgCount = 0;
for (let i = 1; i <= 34; i++) {
    const imgName = `LINE_NOTE_260731_${i}.jpg`;
    const imgPath = path.join(picDir, imgName);
    const srcPattern = `Khife gatevalve picture/LINE_NOTE_260731_${i}.jpg`;
    
    if (fs.existsSync(imgPath)) {
        const imgData = fs.readFileSync(imgPath).toString('base64');
        html = html.split(srcPattern).join(`data:image/jpeg;base64,${imgData}`);
        imgCount++;
        console.log(`✓ Embedded image ${i}`);
    } else {
        // Remove the img-block entirely if image not found
        console.log(`✗ Image ${i} not found, skipping`);
    }
}

// Fix onerror on img tags - hide the entire .img-block if image fails
html = html.replace(/onerror="this\.parentElement\.style\.display='none'"/g, 
    `onerror="this.closest('.img-block').style.display='none'"`);

fs.writeFileSync(outputPath, html, 'utf8');
console.log(`\n✓ Done! Embedded ${imgCount} images.`);
console.log(`✓ Saved: ${outputPath}`);
