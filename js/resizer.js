/* js/resizer.js - GÜNCELLENMİŞ VERSİYON (Canlı Önizleme ve Ayrı İndirme) */

// HTML elementlerini ID'lerine göre seçme
const fileInput = document.getElementById('image-file-input');
// ESKİ: const resizeButton = document.getElementById('choose-btn');
const uploadButton = document.getElementById('upload-start-btn'); // YENİ: Yüklemeyi tetikler
const downloadButton = document.getElementById('download-btn');   // YENİ: İndirmeyi tetikler

const canvas = document.getElementById('image-canvas');
const logEl = document.getElementById('resizer-log');
const statusEl = document.getElementById('resizer-status');
const ctx = canvas.getContext('2d'); 

// Yeni önizleme elementleri
const previewImage = document.getElementById('preview-image');
const previewPlaceholder = document.getElementById('preview-placeholder');

// Ayar elementleri
const resolutionGroup = document.getElementById('resolution-group');
const resizeInputs = document.getElementById('resize-inputs');
const widthInput = document.getElementById('new-width'); 
const heightInput = document.getElementById('new-height');
const formatGroup = document.getElementById('file-format-group');

let originalImage = null;
let fileName = "resized_image";
let lastDataURL = null; // En son oluşturulan görselin Data URL'sini tutar

// YORUM: Loglama fonksiyonu
function log(message, color = 'var(--text-main)') {
    if (!logEl) return;
    logEl.innerHTML = `<div style="color: ${color}; font-weight: 500;">${new Date().toLocaleTimeString()} - ${message}</div>` + logEl.innerHTML;
}

// YORUM: Buton İşlevi 1: Yüklemeyi Başlatma
uploadButton.addEventListener('click', () => {
    fileInput.click();
});

// YORUM: Buton İşlevi 2: İndirmeyi Tetikleme
downloadButton.addEventListener('click', () => {
    if (!lastDataURL) {
        log("Hata: İndirilecek görsel hazır değil.", 'red');
        return;
    }
    
    const dWidth = canvas.width;
    const dHeight = canvas.height;
    const extension = lastDataURL.includes('jpeg') ? 'jpg' : 'png';

    // İndirme işlemini tetikle
    const downloadLink = document.createElement('a'); 
    downloadLink.href = lastDataURL;
    downloadLink.download = `${fileName}_${dWidth}x${dHeight}.${extension}`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    log("Download initiated.", 'var(--accent)');
});

// YORUM: Çözünürlük modu değiştiğinde inputları göster/gizle
resolutionGroup.addEventListener('change', () => {
    const selectedMode = document.querySelector('input[name="resolutionMode"]:checked').value;
    
    if (selectedMode === 'resize' || selectedMode === 'crop_resize') {
        resizeInputs.style.display = 'flex';
        if (originalImage) {
            widthInput.value = originalImage.width;
            heightInput.value = originalImage.height;
            statusEl.textContent = "Enter desired width and height.";
        }
    } else {
        resizeInputs.style.display = 'none';
        statusEl.textContent = "Output will be generated in original pixel dimensions.";
    }
    // Ayar değiştiğinde hemen önizlemeyi yenile
    if (originalImage) {
        processAndPreviewImage();
    }
});

// YORUM: Görsel yüklendiğinde
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    fileName = file.name.replace(/\.[^/.]+$/, ""); 
    log(`File loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'var(--accent)');
    
    downloadButton.disabled = true; // Yeni dosya yüklendi, indirmeyi devre dışı bırak
    
    const reader = new FileReader(); 
    reader.onload = (readerEvent) => {
        originalImage = new Image(); 
        originalImage.src = readerEvent.target.result; 

        originalImage.onload = () => {
            log(`Original Dimensions: ${originalImage.width}x${originalImage.height} pixels.`);
            // Yükleme tamamlandıktan sonra çözünürlük olayını tetikle ve önizlemeyi başlat
            resolutionGroup.dispatchEvent(new Event('change'));
            processAndPreviewImage(); // İlk önizlemeyi göster (Original moda göre)
        };
    };
    reader.readAsDataURL(file);
});


// YORUM: ********* BOYUTLANDIRMA VE ÖNİZLEMEYİ YAPAN ANA FONKSİYON *********
function processAndPreviewImage() {
    if (!originalImage) return;

    const selectedMode = document.querySelector('input[name="resolutionMode"]:checked').value;
    const selectedFormat = document.querySelector('input[name="fileFormat"]:checked').value; 
    const quality = 0.9; 

    // Canvas'a çizim için kullanılacak kaynak (source) ve hedef (destination) koordinatları
    let sx = 0, sy = 0, sWidth = originalImage.width, sHeight = originalImage.height; 
    let dx = 0, dy = 0, dWidth = sWidth, dHeight = sHeight;

    // 2. Boyutları ve Kırpma Alanını Hesaplama
    if (selectedMode === 'resize' || selectedMode === 'crop_resize') {
        dWidth = parseInt(widthInput.value);
        dHeight = parseInt(heightInput.value);
        
        if (dWidth <= 0 || dHeight <= 0 || isNaN(dWidth) || isNaN(dHeight)) {
            statusEl.textContent = "Error: Enter valid dimensions.";
            log("Hata: Geçersiz piksel değerleri girildi.", 'red');
            return;
        }

        if (selectedMode === 'crop_resize') {
            const originalRatio = sWidth / sHeight;
            const targetRatio = dWidth / dHeight;

            if (originalRatio > targetRatio) {
                sWidth = sHeight * targetRatio; 
                sx = (originalImage.width - sWidth) / 2; 
            } else {
                sHeight = sWidth / targetRatio; 
                sy = (originalImage.height - sHeight) / 2; 
            }
        }
    } 
    
    // 3. Canvas İşlemi
    canvas.width = dWidth;
    canvas.height = dHeight;
    ctx.drawImage(originalImage, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

    // 4. Data URL oluşturma ve Önizlemeyi Güncelleme
    lastDataURL = canvas.toDataURL(selectedFormat, quality); 
    
    previewImage.src = lastDataURL;
    previewImage.style.display = 'block';
    previewPlaceholder.style.display = 'none';

    // 5. LOG ve İNDİRME BUTONUNU ETKİNLEŞTİR
    downloadButton.disabled = false;
    log(`Preview generated (${dWidth}x${dHeight}) in ${selectedFormat.split('/')[1].toUpperCase()} mode.`, '#34d399');
    statusEl.textContent = `Processing complete. Output: ${dWidth}x${dHeight}.`;
}

// YORUM: Ayarlar her değiştiğinde önizlemeyi tetikle
resolutionGroup.addEventListener('change', processAndPreviewImage);
formatGroup.addEventListener('change', processAndPreviewImage);
widthInput.addEventListener('input', processAndPreviewImage); 
heightInput.addEventListener('input', processAndPreviewImage);

// YORUM: Sayfa yüklendiğinde varsayılan olarak resize inputlarını gizle
document.addEventListener('DOMContentLoaded', () => {
    resizeInputs.style.display = 'none';
    log("Tool ready. Waiting for image upload.");
});