// script.js

const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTc9JpCGgKdNK_bjag5W5VuF7XdrdfekxI7VFKH8-PAyzakBWpmL7sdwPFUv5ElxVhhHGqMiYoHGrG/pub?output=csv";
const DEFAULT_IMAGE = "https://via.placeholder.com/400x220?text=No+Image";

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 8;

// Cek cache localStorage
function loadFromCache() {
    const cached = localStorage.getItem("produkCache");
    if (cached) {
        const data = JSON.parse(cached);
        const now = new Date().getTime();
        if (now - data.timestamp < 3600 * 1000) { // 1 jam cache
            allProducts = data.products;
            filteredProducts = [...allProducts];
            renderProducts(true);
            return true;
        }
    }
    return false;
}

function saveToCache(products) {
    localStorage.setItem("produkCache", JSON.stringify({
        products,
        timestamp: new Date().getTime()
    }));
}

// Ambil data CSV
if (!loadFromCache()) {
    fetch(URL_CSV)
      .then(res => res.text())
      .then(csv => {
        const rows = csv.split("\n").slice(1);
        allProducts = rows.map(row => {
          const cols = row.split(",");
          if (cols.length >= 4) {
            return {
              kode: cols[0].trim(),
              judul: cols[1].trim(),
              link: cols[2].trim(),
              gambar: cols[3].trim() || DEFAULT_IMAGE
            };
          }
        }).filter(Boolean);
        saveToCache(allProducts);
        filteredProducts = [...allProducts];
        renderProducts(true);
      })
      .catch(err => console.error("Gagal memuat CSV:", err))
      .finally(() => {
        // Jika gagal, sembunyikan loading biar tidak nge-freeze
        document.getElementById("loading").style.display = "none";
      });
}

function renderProducts(hideLoading = false) {
    const container = document.getElementById("productContainer");
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
        document.getElementById("pagination").innerHTML = "";
    } else {
        displayed.forEach(p => {
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
              <img src="${p.gambar}" loading="lazy" alt="${p.judul}" onerror="this.src='${DEFAULT_IMAGE}'">
              <div class="card-content">
                <div class="card-title">${highlightSearch(p.kode)}. ${highlightSearch(p.judul)}</div>
                <a href="${p.link}" target="_blank" rel="noopener noreferrer" class="${getLinkClass(p.link)}">
                  Lihat Produk
                </a>
              </div>
            `;
            container.appendChild(card);
        });
        renderPagination();
    }

    // Sembunyikan spinner hanya setelah produk selesai di-render
    if (hideLoading) {
        setTimeout(() => {
            document.getElementById("loading").style.display = "none";
        }, 400); // beri jeda biar transisi lebih halus
    }
}

// Fungsi helper: tentukan class sesuai domain link
function getLinkClass(url) {
    if (!url) return "";
    if (url.includes("shopee")) return "btn-shopee";
    if (url.includes("tokopedia")) return "btn-tokopedia";
    return "";
}



function renderPagination() {
    const pagination = document.getElementById("pagination");
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
    const q = document.getElementById("searchInput").value.toLowerCase();
    if (!q) return text;
    const regex = new RegExp(`(${q})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
}

document.getElementById("searchInput").addEventListener("input", function() {
    const q = this.value.toLowerCase();
    filteredProducts = allProducts.filter(p => 
        p.kode.toLowerCase().includes(q) || p.judul.toLowerCase().includes(q)
    );
    currentPage = 1;
    renderProducts(true);
});
