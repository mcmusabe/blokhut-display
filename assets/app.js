(function() {
    'use strict';

    const SLIDE_INTERVAL = 5000;
    const PROGRESS_UPDATE_INTERVAL = 500; // Stap elke 500ms (geen vloeiende animatie voor Pi Zero)
    const CONTENT_REFRESH_INTERVAL = 5 * 60 * 1000; // Elke 5 minuten content herladen (was 30 sec, onnodig frequent)

    // Lite-modus: ?lite=1 of ?pi=1 → geen video, alleen placeholder (snel en stabiel op Pi Zero)
    const params = new URLSearchParams(window.location.search || '');
    const LITE_MODE = params.has('lite') || params.has('pi');

    // GitHub configuratie - WIJZIG DIT NAAR JE EIGEN REPO
    const GITHUB_USER = 'mcmusabe';
    const GITHUB_REPO = 'blokhut-display';
    const GITHUB_BRANCH = 'main';
    const GITHUB_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

    // Zet op true om van GitHub te laden, false voor lokale server (Docker)
    const USE_GITHUB = false;

    let slides = [];
    let currentSlide = 0;
    let progressTimer = null;
    let isPaused = false;
    let progressValue = 0;

    const slideshowContainer = document.getElementById('slideshow-container');
    const errorMessage = document.getElementById('error-message');
    const progressBar = document.getElementById('progress-bar');
    const pauseIndicator = document.getElementById('pause-indicator');
    const slideIndicators = document.getElementById('slide-indicators');

    function getAssetUrl(localPath) {
        if (USE_GITHUB) {
            return `${GITHUB_BASE_URL}/${localPath}`;
        }
        return localPath;
    }

    async function loadSlides() {
        const url = USE_GITHUB
            ? `${GITHUB_BASE_URL}/assets/slides.json?t=${Date.now()}`
            : `assets/slides.json?t=${Date.now()}`; // Cache busting voor verse data

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load slides');
        return await response.json();
    }

    async function init() {
        try {
            slides = await loadSlides();
            renderSlides();
            renderIndicators();
            showSlide(0);
            startAutoplay();
            setupKeyboardControls();

            // Start auto-refresh van content
            setInterval(refreshContent, CONTENT_REFRESH_INTERVAL);
            console.log('✅ Display gestart - Content wordt elke 30 seconden ververst');
        } catch (error) {
            console.error('Error loading slides:', error);
            showError();
        }
    }

    async function refreshContent() {
        try {
            const newSlides = await loadSlides();
            // Simpele length check eerst (sneller dan JSON.stringify)
            if (newSlides.length !== slides.length || 
                newSlides.some((s, i) => s.title !== slides[i]?.title)) {
                slides = newSlides;
                const savedSlide = currentSlide;
                renderSlides();
                renderIndicators();
                showSlide(savedSlide < slides.length ? savedSlide : 0);
                console.log('🔄 Content bijgewerkt');
            }
        } catch (error) {
            console.error('Fout bij verversen content:', error);
        }
    }

    function showError() {
        slideshowContainer.style.display = 'none';
        slideIndicators.style.display = 'none';
        errorMessage.classList.remove('hidden');
    }

    function renderIndicators() {
        slideIndicators.innerHTML = '';
        slides.forEach((_, index) => {
            const indicator = document.createElement('div');
            indicator.className = 'slide-indicator';
            indicator.addEventListener('click', () => {
                showSlide(index);
                resetProgress();
            });
            slideIndicators.appendChild(indicator);
        });
    }

    function updateIndicators() {
        const indicators = slideIndicators.querySelectorAll('.slide-indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentSlide);
        });
    }

    function renderSlides() {
        slideshowContainer.innerHTML = '';

        slides.forEach((slide, index) => {
            const slideEl = document.createElement('div');
            let className = 'slide';
            if (slide.type) className += ` ${slide.type}-slide`;
            slideEl.className = className;
            slideEl.dataset.index = index;

            let html = '';

            // Video slide: in lite-modus alleen placeholder (geen video = snel en pro op Pi)
            if (slide.type === 'video' && slide.video) {
                if (LITE_MODE) {
                    html += `
                        <div class="video-container video-container--lite">
                            <div class="video-placeholder"></div>
                            <div class="video-overlay">
                                <div class="slide-content">
                                    ${slide.badge ? `<span class="product-badge">${slide.badge}</span>` : ''}
                                    ${slide.title ? `<h1>${slide.title}</h1>` : ''}
                                    ${slide.subtitle ? `<p class="subtitle">${slide.subtitle}</p>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    const videoUrl = getAssetUrl(slide.video);
                    const posterAttr = slide.poster ? ` poster="${getAssetUrl(slide.poster)}"` : '';
                    html += `
                        <div class="video-container">
                            <video class="slide-video" preload="none" muted loop playsinline data-src="${videoUrl}"${posterAttr}>
                                <source type="video/mp4">
                            </video>
                            <div class="video-overlay">
                                <div class="slide-content">
                                    ${slide.badge ? `<span class="product-badge">${slide.badge}</span>` : ''}
                                    ${slide.title ? `<h1>${slide.title}</h1>` : ''}
                                    ${slide.subtitle ? `<p class="subtitle">${slide.subtitle}</p>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
            // Product slides with image (different layout)
            else if (slide.type === 'product' && slide.image) {
                html += '<div class="slide-content">';

                if (slide.badge) {
                    html += `<span class="product-badge">${slide.badge}</span>`;
                }
                if (slide.title) {
                    html += `<h1>${slide.title}</h1>`;
                }
                if (slide.subtitle) {
                    html += `<p class="subtitle">${slide.subtitle}</p>`;
                }
                if (slide.price) {
                    html += `<p class="price">${slide.price}</p>`;
                    if (slide.priceNote) {
                        html += `<p class="price-note">${slide.priceNote}</p>`;
                    }
                }
                if (slide.cta) {
                    html += `<p class="cta">${slide.cta}</p>`;
                }
                html += '</div>';

                html += `
                    <div class="product-image-container">
                        <img src="${getAssetUrl(slide.image)}" alt="${slide.title}" class="product-image"
                             onerror="this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'>Foto: ${slide.image}</div>'">
                    </div>
                `;
            } else {
                // Regular slides
                html += '<div class="slide-content">';

                // Product badge
                if (slide.badge) {
                    html += `<span class="product-badge">${slide.badge}</span>`;
                }

                // Title
                if (slide.title) {
                    html += `<h1>${slide.title}</h1>`;
                }

                // Divider
                if (slide.divider) {
                    html += '<div class="divider"></div>';
                }

                // Subtitle
                if (slide.subtitle) {
                    html += `<p class="subtitle">${slide.subtitle}</p>`;
                }

                // Stats row
                if (slide.stats && slide.stats.length > 0) {
                    html += '<div class="stats-row">';
                    slide.stats.forEach(stat => {
                        html += `
                            <div class="stat-item">
                                <div class="stat-number">${stat.number}</div>
                                <div class="stat-label">${stat.label}</div>
                            </div>
                        `;
                    });
                    html += '</div>';
                }

                // URL Display
                if (slide.url) {
                    html += `<div class="url-display">${slide.url}</div>`;
                }

                // Content list
                if (slide.content && slide.content.length > 0) {
                    html += '<ul class="content-list">';
                    slide.content.forEach(item => {
                        html += `<li>${item}</li>`;
                    });
                    html += '</ul>';
                }

                // Features grid
                if (slide.features && slide.features.length > 0) {
                    html += '<div class="features-grid">';
                    slide.features.forEach(feature => {
                        html += `
                            <div class="feature-card">
                                <div class="feature-icon">${feature.icon || ''}</div>
                                <h3>${feature.title}</h3>
                                <p>${feature.description || ''}</p>
                            </div>
                        `;
                    });
                    html += '</div>';
                }

                // Info grid
                if (slide.info && slide.info.length > 0) {
                    html += '<div class="info-grid">';
                    slide.info.forEach(item => {
                        html += `
                            <div class="info-card">
                                <div class="label">${item.label}</div>
                                <div class="value">${item.value}</div>
                            </div>
                        `;
                    });
                    html += '</div>';
                }

                // Phone number
                if (slide.phone) {
                    html += `
                        <div class="contact-highlight">
                            <div class="phone">${slide.phone}</div>
                        </div>
                    `;
                }

                // Price
                if (slide.price) {
                    html += `<p class="price">${slide.price}</p>`;
                    if (slide.priceNote) {
                        html += `<p class="price-note">${slide.priceNote}</p>`;
                    }
                }

                // Call to action
                if (slide.cta) {
                    html += `<p class="cta">${slide.cta}</p>`;
                }

                // QR code - real QR using API
                if (slide.qr) {
                    const qrUrl = slide.qrUrl || slide.url || 'www.blokhutwinkel.nl';
                    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://${qrUrl.replace('https://', '').replace('http://', '')}`;
                    html += `
                        <div class="qr-placeholder">
                            <div class="qr-box qr-real">
                                <img src="${qrApiUrl}" alt="QR Code" class="qr-image">
                            </div>
                            <p class="qr-label">Scan voor meer info</p>
                        </div>
                    `;
                }

                html += '</div>';
            }

            slideEl.innerHTML = html;
            slideshowContainer.appendChild(slideEl);
        });
    }

    function showSlide(index) {
        if (slides.length === 0) return;

        if (index >= slides.length) index = 0;
        else if (index < 0) index = slides.length - 1;

        currentSlide = index;

        const allSlides = slideshowContainer.querySelectorAll('.slide');
        allSlides.forEach((slide, i) => {
            const isActive = i === index;
            slide.classList.toggle('active', isActive);

            const video = slide.querySelector('.slide-video');
            if (!video) return;
            const source = video.querySelector('source');
            if (isActive) {
                const src = video.dataset.src;
                if (src && (!source.src || source.src !== src)) {
                    source.src = src;
                    video.load();
                    video.play().catch(() => {});
                } else if (source.src) {
                    video.play().catch(() => {});
                }
            } else {
                video.pause();
                source.removeAttribute('src');
                video.load();
            }
        });

        updateIndicators();
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
        resetProgress();
    }

    function prevSlide() {
        showSlide(currentSlide - 1);
        resetProgress();
    }

    function resetProgress() {
        progressValue = 0;
        updateProgressBar();
    }

    function updateProgressBar() {
        progressBar.style.width = progressValue + '%';
    }

    function startAutoplay() {
        if (progressTimer) clearInterval(progressTimer);

        progressTimer = setInterval(() => {
            if (!isPaused) {
                progressValue += (PROGRESS_UPDATE_INTERVAL / SLIDE_INTERVAL) * 100;
                if (progressValue >= 100) {
                    progressValue = 0;
                    nextSlide();
                }
                updateProgressBar();
            }
        }, PROGRESS_UPDATE_INTERVAL);
    }

    function togglePause() {
        isPaused = !isPaused;
        pauseIndicator.classList.toggle('visible', isPaused);
    }

    function setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'ArrowLeft':
                    prevSlide();
                    break;
                case 'ArrowRight':
                    nextSlide();
                    break;
                case ' ':
                    event.preventDefault();
                    togglePause();
                    break;
            }
        });
    }

    // News Ticker - scroll-animatie met dubbele content voor naadloze loop (GPU: translate3d)
    const NEWS_REFRESH_INTERVAL = 5 * 60 * 1000;

    async function loadNews() {
        const tickerScroll = document.getElementById('news-ticker-scroll');
        if (!tickerScroll) return;

        try {
            const rssUrl = 'https://www.gld.nl/rss/index.xml';
            const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('RSS fetch failed');

            const data = await response.json();

            if (data.status === 'ok' && data.items && data.items.length > 0) {
                newsItems = data.items.slice(0, 10).map(item => {
                    const date = new Date(item.pubDate);
                    const time = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
                    return { time: time, text: item.title };
                });
                renderNewsTicker(newsItems);
                console.log('Live nieuws geladen van Omroep Gelderland');
            } else {
                throw new Error('No news items');
            }
        } catch (error) {
            console.log('Fallback naar lokaal nieuws:', error.message);
            try {
                const localResponse = await fetch('assets/news.json');
                if (localResponse.ok) {
                    newsItems = await localResponse.json();
                    renderNewsTicker(newsItems);
                } else {
                    throw new Error('Local news not found');
                }
            } catch (localError) {
                newsItems = [
                    { time: "09:00", text: "Welkom bij Blokhutwinkel - Europa's grootste showroom in Zutphen" },
                    { time: "09:15", text: "Meer dan 100 blokhutten en tuinhuizen te bezichtigen" },
                    { time: "09:30", text: "Gratis advies en 3D tekening bij elke offerte" },
                    { time: "09:45", text: "Geen aanbetaling nodig - betaal pas bij levering" }
                ];
                renderNewsTicker(newsItems);
            }
        }

        setTimeout(loadNews, NEWS_REFRESH_INTERVAL);
    }

    function renderNewsTicker(items) {
        const tickerScroll = document.getElementById('news-ticker-scroll');
        if (!tickerScroll || !items.length) return;

        const duplicated = [...items, ...items];
        tickerScroll.innerHTML = duplicated.map(item => `
            <div class="news-item">
                ${item.time ? `<span class="news-time">${item.time}</span>` : ''}
                <span class="news-text">${item.text}</span>
            </div>
        `).join('');

        const contentWidth = tickerScroll.scrollWidth / 2;
        const duration = Math.max(40, Math.min(90, contentWidth / 35));
        tickerScroll.style.animationDuration = `${duration}s`;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            loadNews();
        });
    } else {
        init();
        loadNews();
    }
})();
