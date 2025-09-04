const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTc9JpCGgKdNK_bjag5W5VuF7XdrdfekxI7VFKH8-PAyzakBWpmL7sdwPFUv5ElxVhhHGqMiYoHGrG/pub?output=csv";
const DEFAULT_IMAGE = "https://via.placeholder.com/400x220.png?text=No+Image";

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 8;

// Fungsi untuk mendeteksi platform dari URL - Tampilkan 'tiktok' untuk Tokopedia
function detectPlatform(link) {
    if (link.includes('shopee')) return 'shopee';
    // Untuk semua link Tokopedia, tampilkan sebagai 'tiktok'
    if (link.includes('tokopedia')) return 'tiktok';
    if (link.includes('tiktok')) return 'tiktok';
    return 'other';
}

// Cek cache localStorage
function loadFromCache() {
    try {
        const cached = localStorage.getItem("produkCache");
        if (cached) {
            const data = JSON.parse(cached);
            const now = new Date().getTime();
            if (now - data.timestamp < 3600 * 1000) {
                allProducts = data.products;
                filteredProducts = [...allProducts];
                renderProducts(true);
                return true;
            }
        }
    } catch (e) {
        console.error("Error loading from cache:", e);
    }
    return false;
}

function saveToCache(products) {
    try {
        localStorage.setItem("produkCache", JSON.stringify({
            products,
            timestamp: new Date().getTime()
        }));
    } catch (e) {
        console.error("Error saving to cache:", e);
    }
}

// Ambil data CSV
async function loadProducts() {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) errorMessage.style.display = 'none';

    if (!loadFromCache()) {
        try {
            const response = await fetch(URL_CSV);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const csv = await response.text();
            const rows = csv.split("\n").slice(1);
            let products = rows.map(row => {
                const cols = row.split(",");
                if (cols.length >= 4) {
                    const originalLink = cols[2].trim();

                    // JANGAN ubah link Tokopedia, biarkan tetap asli
                    const processedLink = originalLink;

                    return {
                        kode: cols[0].trim(),
                        judul: cols[1].trim(),
                        link: processedLink, // Link tetap asli
                        gambar: cols[3].trim() || DEFAULT_IMAGE,
                        platform: detectPlatform(processedLink) // Tapi tampilkan sebagai TikTok
                    };
                }
                return null;
            }).filter(Boolean);

            // Simpan produk ke cache dan render
            saveToCache(products);
            allProducts = products;
            filteredProducts = [...allProducts];
            renderProducts(true);
        } catch (err) {
            console.error("Gagal memuat CSV:", err);
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) errorMessage.style.display = 'flex';
        } finally {
            const loadingElement = document.getElementById("loading");
            if (loadingElement) loadingElement.style.display = "none";
        }
    }
}

function renderProducts(hideLoading = false) {
    const container = document.getElementById("productContainer");
    const pagination = document.getElementById("pagination");

    if (!container) return;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const displayed = filteredProducts.slice(start, end);

    container.innerHTML = "";

    if (displayed.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <div>🔍</div>
                <h3>Produk tidak ditemukan</h3>
                <p>Coba kata kunci pencarian lain</p>
            </div>
        `;
        if (pagination) pagination.innerHTML = "";
    } else {
        displayed.forEach(p => {
            const card = document.createElement("div");
            card.className = `card ${p.platform}`; // Class akan menjadi 'card tiktok' untuk Tokopedia
            card.innerHTML = `
              <div class="platform-badge">${p.platform.toUpperCase()}</div>
              <div class="image-container">
                <img src="${p.gambar}" alt="${p.judul}" onerror="this.src='${DEFAULT_IMAGE}'">
                <div class="image-placeholder"></div>
              </div>
              <div class="card-content">
                <div class="card-title">${highlightSearch(p.kode)}. ${highlightSearch(p.judul)}</div>
                <a href="${p.link}" target="_blank" rel="noopener noreferrer" class="${p.platform}-btn">Lihat Produk</a>
              </div>
            `;
            container.appendChild(card);
        });
        renderPagination();
    }

    if (hideLoading) {
        setTimeout(() => {
            const loadingElement = document.getElementById("loading");
            if (loadingElement) loadingElement.style.display = "none";
        }, 400);
    }
}

// Fungsi setupSearch
function setupSearch() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            const q = this.value.toLowerCase();
            filteredProducts = allProducts.filter(p =>
                p.kode.toLowerCase().includes(q) || p.judul.toLowerCase().includes(q)
            );
            currentPage = 1;
            renderProducts(true);
        });
    }
}

// Fungsi pagination
function renderPagination() {
    const pagination = document.getElementById("pagination");
    if (!pagination) return;

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    if (filteredProducts.length === 0) {
        pagination.innerHTML = "";
        return;
    }

    let buttons = `<button onclick="prevPage()" ${currentPage === 1 ? "disabled" : ""}>Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        buttons += `<button onclick="goToPage(${i})" ${i === currentPage ? "disabled" : ""}>${i}</button>`;
    }
    buttons += `<button onclick="nextPage()" ${currentPage === totalPages ? "disabled" : ""}>Next</button>`;

    pagination.innerHTML = buttons;
}

function nextPage() {
    if (currentPage < Math.ceil(filteredProducts.length / itemsPerPage)) {
        currentPage++;
        renderProducts();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderProducts();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

function goToPage(page) {
    currentPage = page;
    renderProducts();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Highlight hasil pencarian
function highlightSearch(text) {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return text;

    const q = searchInput.value.toLowerCase();
    if (!q) return text;
    const regex = new RegExp(`(${q})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
}

// Inisialisasi ketika DOM siap
document.addEventListener('DOMContentLoaded', function () {
    loadProducts();
    setupSearch();
});

// Fallback jika DOMContentLoaded sudah terlewat
if (document.readyState !== 'loading') {
    loadProducts();
    setupSearch();
}