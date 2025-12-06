/* js/app.js */

// Araç bölümüne kaydırma fonksiyonu (Ana sayfada kullanılabilir, bu sayfada zorunlu değil)
function scrollToTool() {
    const el = document.getElementById("ipynb-to-py-tool");
    if (el) {
        // Yumuşak kaydırma efekti ile sayfanın başına git
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// HTML elementlerini ID'lerine göre seçme
const dropZone = document.getElementById("drop-zone"); // Dosya bırakma alanı
const fileInput = document.getElementById("file-input"); // Dosya seçme inputu
const chooseBtn = document.getElementById("choose-btn"); // Dosya seçme butonu
const previewEl = document.getElementById("output-preview"); // Kod önizleme alanı
const fileMeta = document.getElementById("file-meta"); // Dosya meta bilgisi gösterim alanı
const downloadLink = document.getElementById("download-link"); // İndirme linki

let lastPyBlobUrl = null; // Daha önce oluşturulmuş Blob URL'sini tutar

// İndirme linki içeriğini ve özelliklerini ayarlama fonksiyonu
function setDownloadContent(pyText, filename) {
    // Önceki Blob URL'sini hafızadan temizle (bellek yönetimi için önemli)
    if (lastPyBlobUrl) {
        URL.revokeObjectURL(lastPyBlobUrl);
    }
    
    // Python metnini bir Blob (ikili veri) nesnesine dönüştür
    const blob = new Blob([pyText], { type: "text/x-python" });
    
    // Blob için geçici bir URL oluştur
    lastPyBlobUrl = URL.createObjectURL(blob);
    
    // İndirme linki özelliklerini ayarla
    downloadLink.href = lastPyBlobUrl;
    downloadLink.download = filename || "notebook.py"; // Dosya adı
    downloadLink.style.pointerEvents = "auto"; // Tıklamayı etkinleştir
    downloadLink.style.opacity = "1"; // Görünür yap
}

// Başlangıç/yer tutucu ekranı yazılarını güncelleme
function updatePreviewPlaceholder() {
    previewEl.textContent =
        "# Converted from Jupyter Notebook\n" +
        "# tool-convert.com – IPYNB → PY\n\n" +
        "# Cell 1\n" +
        "# ----------------------------------------\n" +
        "# Your converted Python code will appear here\n" +
        "# after you drop a .ipynb file on the left.";
        
    fileMeta.textContent = "No file loaded"; // Meta bilgisini sıfırla
    downloadLink.style.pointerEvents = "none"; // İndirmeyi devre dışı bırak
    downloadLink.style.opacity = "0.4"; // Soluk göster
}

// Ana dönüştürücü mantığı: IPYNB (JSON) dosyasını Python metnine çevirir
function convertIpynbToPy(text, fileName) {
    try {
        // Gelen metni JSON nesnesine parse et
        const data = JSON.parse(text);
        // Hücreler dizisini al, yoksa boş dizi kullan
        const cells = Array.isArray(data.cells) ? data.cells : [];
        const lines = []; // Çıktı Python kod satırları

        // Başlık yorumlarını ekle
        lines.push("# Converted from Jupyter Notebook");
        lines.push("# tool-convert.com – IPYNB → PY");
        if (fileName) {
            lines.push("# Source: " + fileName);
        }
        lines.push("");

        let codeCellIndex = 0; // Kod hücresi sayacı

        // Her hücreyi döngüye al
        cells.forEach((cell) => {
            // Sadece 'code' tipindeki hücreleri işle
            if (cell.cell_type === "code") {
                codeCellIndex += 1;
                
                // Hücre ayırıcı yorumları ekle
                lines.push("# Cell " + codeCellIndex);
                lines.push("#" + "-".repeat(40));

                // Hücre kaynağını al
                const src = Array.isArray(cell.source) ? cell.source : [];
                
                // Kaynak kod satırlarını ana diziye ekle
                src.forEach((line) => {
                    // Satır sonu karakterlerini temizle ve ekle
                    lines.push(line.replace(/\r?\n$/, ""));
                });
                lines.push(""); // Hücre sonuna boş satır ekle
            }
        });

        // Eğer hiç kod hücresi bulunamazsa uyarı ekle
        if (codeCellIndex === 0) {
            lines.push("# (No code cells were found in this notebook.)");
        }

        // Tüm satırları birleştirip çıktı olarak döndür
        return lines.join("\n");
    } catch (err) {
        // Hata yakalanırsa konsola yaz ve kullanıcıya hata mesajı göster
        console.error("Conversion error:", err);
        return (
            "# Failed to parse .ipynb file.\n" +
            "# Make sure you uploaded a valid Jupyter notebook.\n" +
            "# Error: " +
            (err && err.message ? err.message : String(err))
        );
    }
}

// Dosya okuma ve dönüştürme işlemini yöneten ana fonksiyon
function handleFile(file) {
    if (!file) return; // Dosya yoksa çık

    const reader = new FileReader(); // Dosya okuyucu
    
    // Dosya okuma başarılı olursa
    reader.onload = (ev) => {
        const text = String(ev.target.result || ""); // Dosya içeriğini metin olarak al
        const py = convertIpynbToPy(text, file.name || ""); // Dönüştürme işlemini yap
        
        previewEl.textContent = py; // Önizleme alanını güncelle
        fileMeta.textContent = file.name + " (" + file.size + " bytes)"; // Meta bilgiyi güncelle
        
        // Yeni dosya adını oluştur ve indirme içeriğini ayarla
        setDownloadContent(py, (file.name || "notebook").replace(/\.ipynb$/i, "") + ".py");
    };
    
    // Dosya okuma hatası oluşursa
    reader.onerror = () => {
        previewEl.textContent =
            "# Failed to read file.\n# Please try again with a valid .ipynb notebook.";
        fileMeta.textContent = "Read error";
        downloadLink.style.pointerEvents = "none";
        downloadLink.style.opacity = "0.4";
    };
    
    // Dosyayı metin olarak okumaya başla
    reader.readAsText(file);
}

// Olay dinleyicileri (Event Listeners)

// Butonlara tıklandığında gizli dosya inputunu tetikle
chooseBtn.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("click", () => fileInput.click());

// Dosya seçildiğinde
fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
        handleFile(file); // Dosya işleme fonksiyonunu çağır
    }
});

// Drag & Drop olayları:
// Dosya sürüklenirken
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault(); // Varsayılan davranışı engelle (tarayıcının dosyayı açmasını önler)
    dropZone.classList.add("drag-over"); // CSS sınıfı ile görsel geri bildirim ver
});

// Sürüklenen dosya alandan ayrılırken
dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over"); // Görsel geri bildirimi kaldır
});

// Dosya bırakıldığında
dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over"); // Görsel geri bildirimi kaldır
    
    // Bırakılan dosyayı al
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
        handleFile(file); // Dosya işleme fonksiyonunu çağır
    }
});

// Sayfa yüklendiğinde çalıştır (Başlangıç yer tutucusunu göster)
updatePreviewPlaceholder();