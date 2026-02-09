const API_BASE = 'http://localhost:3000/api';

let slides = [];
let filteredSlides = [];
let currentSlideIndex = null;
let isSearching = false;

// Auth check on page load
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            credentials: 'include'
        });
        if (!response.ok) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Logout handler
async function logout() {
    try {
        const response = await fetch(`${API_BASE}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        if (response.ok) {
            window.location.href = 'login.html';
        } else {
            showMessage('Fout bij uitloggen', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Fout bij uitloggen', 'error');
    }
}

// Utility functions
function showMessage(text, type = 'success') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type} show`;
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

// Tab switching
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
});

// Load data
async function loadSlides() {
    const loadingEl = document.getElementById('loading-indicator');
    const slidesList = document.getElementById('slides-list');
    
    try {
        loadingEl?.classList.remove('hidden');
        slidesList?.classList.add('hidden');
        
        const response = await fetch(`${API_BASE}/slides`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Fout bij laden slides');
        slides = await response.json();
        filteredSlides = [...slides];
        renderSlides();
        updateStats();
    } catch (error) {
        console.error('Fout bij laden slides:', error);
        showMessage('Fout bij laden slides', 'error');
    } finally {
        loadingEl?.classList.add('hidden');
        slidesList?.classList.remove('hidden');
    }
}

async function loadConfig() {
    try {
        const response = await fetch(`${API_BASE}/config`, {
            credentials: 'include'
        });
        if (!response.ok) {
            // Als server error, gebruik defaults
            const rssInput = document.getElementById('config-rss-url');
            const refreshInput = document.getElementById('config-refresh-minutes');
            if (rssInput) rssInput.value = 'https://www.gld.nl/rss/index.xml';
            if (refreshInput) refreshInput.value = 5;
            return;
        }
        const config = await response.json();
        const rssInput = document.getElementById('config-rss-url');
        const refreshInput = document.getElementById('config-refresh-minutes');
        if (rssInput) rssInput.value = config.rssUrl || 'https://www.gld.nl/rss/index.xml';
        if (refreshInput) refreshInput.value = config.newsRefreshMinutes != null ? config.newsRefreshMinutes : 5;
    } catch (error) {
        console.error('Fout bij laden config:', error);
        // Gebruik defaults in plaats van error te tonen
        const rssInput = document.getElementById('config-rss-url');
        const refreshInput = document.getElementById('config-refresh-minutes');
        if (rssInput) rssInput.value = 'https://www.gld.nl/rss/index.xml';
        if (refreshInput) refreshInput.value = 5;
    }
}

// Render functions
function renderSlides() {
    const container = document.getElementById('slides-list');
    const emptyState = document.getElementById('empty-state');
    if (!container) return;
    
    const slidesToRender = isSearching ? filteredSlides : slides;
    
    if (slidesToRender.length === 0) {
        container.classList.add('hidden');
        emptyState?.classList.remove('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    emptyState?.classList.add('hidden');
    
    container.innerHTML = slidesToRender.map((slide, index) => {
        const originalIndex = slides.indexOf(slide);
        return `
        <div class="item-card magic-card" data-index="${originalIndex}">
            <div class="item-info">
                <h3>${escapeHtml(slide.title || slide.id || 'Geen titel')}</h3>
                <p><strong>Type:</strong> ${escapeHtml(slide.type || 'onbekend')} | <strong>ID:</strong> ${escapeHtml(slide.id || 'geen')}</p>
                ${slide.subtitle ? `<p>${escapeHtml(slide.subtitle)}</p>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-small" onclick="duplicateSlide(${originalIndex})" title="Dupliceren">📋</button>
                <button class="btn btn-secondary btn-small" onclick="editSlide(${originalIndex})">Bewerken</button>
                <button class="btn btn-danger btn-small" onclick="confirmDeleteSlide(${originalIndex})">Verwijderen</button>
            </div>
        </div>
    `}).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateStats() {
    const countEl = document.getElementById('slides-count');
    if (countEl) {
        countEl.textContent = `${slides.length} ${slides.length === 1 ? 'slide' : 'slides'}`;
    }
}

// Toggle form fields based on slide type
function toggleSlideFields() {
    const type = document.getElementById('slide-type').value;
    
    // Hide all optional fields
    document.getElementById('divider-group').classList.add('hidden');
    document.getElementById('badge-group').classList.add('hidden');
    document.getElementById('image-group').classList.add('hidden');
    document.getElementById('video-group').classList.add('hidden');
    document.getElementById('price-group').classList.add('hidden');
    document.getElementById('price-note-group').classList.add('hidden');
    document.getElementById('url-group').classList.add('hidden');
    document.getElementById('qr-group').classList.add('hidden');
    document.getElementById('cta-group').classList.add('hidden');
    
    // Show relevant fields based on type
    if (type === 'welcome') {
        document.getElementById('divider-group').classList.remove('hidden');
    }
    
    if (type === 'video') {
        document.getElementById('badge-group').classList.remove('hidden');
        document.getElementById('video-group').classList.remove('hidden');
    }
    
    if (type === 'product') {
        document.getElementById('badge-group').classList.remove('hidden');
        document.getElementById('image-group').classList.remove('hidden');
        document.getElementById('price-group').classList.remove('hidden');
        document.getElementById('price-note-group').classList.remove('hidden');
    }
    
    if (type === 'online') {
        document.getElementById('url-group').classList.remove('hidden');
        document.getElementById('qr-group').classList.remove('hidden');
        document.getElementById('cta-group').classList.remove('hidden');
    }
}

// Slide functions
function editSlide(index) {
    currentSlideIndex = index;
    const slide = slides[index];
    
    document.getElementById('slide-index').value = index;
    document.getElementById('slide-id-field').value = slide.id || '';
    document.getElementById('slide-type').value = slide.type || 'product';
    document.getElementById('slide-title').value = slide.title || '';
    document.getElementById('slide-subtitle').value = slide.subtitle || '';
    document.getElementById('slide-image').value = slide.image || '';
    document.getElementById('slide-video').value = slide.video || '';
    document.getElementById('slide-price').value = slide.price || '';
    document.getElementById('slide-price-note').value = slide.priceNote || '';
    document.getElementById('slide-badge').value = slide.badge || '';
    document.getElementById('slide-url').value = slide.url || '';
    document.getElementById('slide-divider').checked = slide.divider || false;
    document.getElementById('slide-qr').checked = slide.qr || false;
    document.getElementById('slide-cta').value = slide.cta || '';
    
    // Show image preview if image exists
    if (slide.image && imagePreview && imagePreviewImg) {
        imagePreviewImg.src = slide.image.startsWith('http') ? slide.image : `/${slide.image}`;
        imagePreview.classList.remove('hidden');
    } else if (imagePreview) {
        imagePreview.classList.add('hidden');
    }
    
    toggleSlideFields();
    document.getElementById('slide-modal').classList.add('active');
}

function confirmDeleteSlide(index) {
    const slide = slides[index];
    const title = slide.title || slide.id || 'deze slide';
    showConfirmDialog(
        'Slide Verwijderen',
        `Weet je zeker dat je "${title}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`,
        () => deleteSlide(index)
    );
}

function deleteSlide(index) {
    slides.splice(index, 1);
    filteredSlides = isSearching ? filterSlides(document.getElementById('search-slides')?.value || '') : [...slides];
    renderSlides();
    updateStats();
    saveSlides();
}

function duplicateSlide(index) {
    const slide = slides[index];
    const duplicated = JSON.parse(JSON.stringify(slide));
    duplicated.id = duplicated.id ? `${duplicated.id}-copy` : `slide-${Date.now()}`;
    if (duplicated.title) duplicated.title = `${duplicated.title} (kopie)`;
    slides.push(duplicated);
    filteredSlides = isSearching ? filterSlides(document.getElementById('search-slides')?.value || '') : [...slides];
    renderSlides();
    updateStats();
    saveSlides();
    showMessage('Slide gedupliceerd!', 'success');
}

function filterSlides(query) {
    if (!query.trim()) {
        isSearching = false;
        return [...slides];
    }
    isSearching = true;
    const lowerQuery = query.toLowerCase();
    return slides.filter(slide => 
        (slide.title && slide.title.toLowerCase().includes(lowerQuery)) ||
        (slide.id && slide.id.toLowerCase().includes(lowerQuery)) ||
        (slide.subtitle && slide.subtitle.toLowerCase().includes(lowerQuery)) ||
        (slide.type && slide.type.toLowerCase().includes(lowerQuery))
    );
}

document.getElementById('slide-type').addEventListener('change', toggleSlideFields);

document.getElementById('add-slide').addEventListener('click', () => {
    currentSlideIndex = null;
    document.getElementById('slide-form').reset();
    document.getElementById('slide-type').value = 'product';
    document.getElementById('slide-index').value = '';
    if (imagePreview) imagePreview.classList.add('hidden');
    toggleSlideFields();
    document.getElementById('slide-modal').classList.add('active');
});

document.getElementById('slide-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const slide = {
        id: document.getElementById('slide-id-field').value,
        type: document.getElementById('slide-type').value,
    };
    
    const title = document.getElementById('slide-title').value;
    const subtitle = document.getElementById('slide-subtitle').value;
    
    if (title) slide.title = title;
    if (subtitle) slide.subtitle = subtitle;
    
    // Type-specific fields
    if (slide.type === 'welcome') {
        if (document.getElementById('slide-divider').checked) {
            slide.divider = true;
        }
        // Stats can be added manually in JSON if needed
    }
    
    if (slide.type === 'video') {
        const badge = document.getElementById('slide-badge').value;
        const video = document.getElementById('slide-video').value;
        if (badge) slide.badge = badge;
        if (video) slide.video = video;
    }
    
    if (slide.type === 'product') {
        const badge = document.getElementById('slide-badge').value;
        const image = document.getElementById('slide-image').value;
        const price = document.getElementById('slide-price').value;
        const priceNote = document.getElementById('slide-price-note').value;
        if (badge) slide.badge = badge;
        if (image) slide.image = image;
        if (price) slide.price = price;
        if (priceNote) slide.priceNote = priceNote;
    }
    
    if (slide.type === 'online') {
        const url = document.getElementById('slide-url').value;
        const cta = document.getElementById('slide-cta').value;
        if (url) slide.url = url;
        if (document.getElementById('slide-qr').checked) slide.qr = true;
        if (cta) slide.cta = cta;
    }
    
    if (currentSlideIndex !== null) {
        slides[currentSlideIndex] = slide;
    } else {
        slides.push(slide);
    }
    
    filteredSlides = isSearching ? filterSlides(document.getElementById('search-slides')?.value || '') : [...slides];
    renderSlides();
    updateStats();
    await saveSlides();
    document.getElementById('slide-modal').classList.remove('active');
});

// Config form
document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rssUrl = document.getElementById('config-rss-url').value.trim();
    const refreshMinutes = parseInt(document.getElementById('config-refresh-minutes').value, 10);
    if (!rssUrl) {
        showMessage('Vul een RSS-URL in', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                rssUrl: rssUrl,
                newsRefreshMinutes: isNaN(refreshMinutes) || refreshMinutes < 1 ? 5 : Math.min(60, refreshMinutes)
            })
        });
        if (!response.ok) throw new Error('Fout bij opslaan');
        showMessage('Instellingen opgeslagen. Display haalt nieuws automatisch op via de RSS-feed.', 'success');
    } catch (error) {
        console.error('Fout bij opslaan config:', error);
        showMessage('Fout bij opslaan instellingen', 'error');
    }
});

// Save functions
async function saveSlides() {
    try {
        const response = await fetch(`${API_BASE}/slides`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(slides)
        });
        
        if (!response.ok) throw new Error('Fout bij opslaan');
        
        showMessage('Slides opgeslagen!', 'success');
    } catch (error) {
        console.error('Fout bij opslaan slides:', error);
        showMessage('Fout bij opslaan slides', 'error');
    }
}

document.getElementById('save-all').addEventListener('click', async () => {
    await saveSlides();
    showMessage('Slides opgeslagen!', 'success');
});

// Upload functions
document.querySelectorAll('.btn-upload').forEach(btn => {
    btn.addEventListener('click', async () => {
        const input = btn.previousElementSibling;
        const file = input.files[0];
        
        if (!file) {
            showMessage('Selecteer eerst een bestand', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            btn.disabled = true;
            btn.textContent = 'Uploaden...';
            
            const response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (!response.ok) throw new Error('Upload mislukt');
            
            const result = await response.json();
            const targetInput = input.previousElementSibling.previousElementSibling || 
                              input.closest('.form-group').querySelector('input[type="text"]');
            
            if (targetInput) {
                targetInput.value = result.path;
                showMessage('Bestand geüpload!', 'success');
                // Trigger preview update
                if (targetInput.id === 'slide-image') {
                    targetInput.dispatchEvent(new Event('input'));
                }
            }
        } catch (error) {
            console.error('Upload fout:', error);
            showMessage('Fout bij uploaden', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Upload';
            input.value = '';
        }
    });
});

// Modal close
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
    });
});

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Search functionality
const searchInput = document.getElementById('search-slides');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        filteredSlides = filterSlides(query);
        renderSlides();
    });
}

// Image preview
const imageUpload = document.getElementById('slide-image-upload');
const imageInput = document.getElementById('slide-image');
const imagePreview = document.getElementById('image-preview');
const imagePreviewImg = document.getElementById('image-preview-img');

if (imageUpload) {
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreviewImg.src = event.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
}

if (imageInput) {
    imageInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        if (url && (url.startsWith('http') || url.startsWith('assets/'))) {
            imagePreviewImg.src = url.startsWith('http') ? url : `/${url}`;
            imagePreview.classList.remove('hidden');
        } else if (!url) {
            imagePreview.classList.add('hidden');
        }
    });
}

function clearImagePreview() {
    imagePreview.classList.add('hidden');
    imagePreviewImg.src = '';
    if (imageInput) imageInput.value = '';
    if (imageUpload) imageUpload.value = '';
}

// Confirm Dialog
function showConfirmDialog(title, message, onConfirm) {
    const dialog = document.getElementById('confirm-dialog');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');
    
    if (!dialog) return;
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    const handleYes = () => {
        dialog.classList.remove('active');
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
        if (onConfirm) onConfirm();
    };
    
    const handleNo = () => {
        dialog.classList.remove('active');
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
    };
    
    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
    dialog.classList.add('active');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC closes modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    // Ctrl/Cmd + S saves slides
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('save-all')?.click();
    }
    
    // Ctrl/Cmd + N adds new slide
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('add-slide')?.click();
    }
});

// Logout button handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// Initialize - check auth first
(async () => {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        loadSlides();
        loadConfig();
    }
})();
