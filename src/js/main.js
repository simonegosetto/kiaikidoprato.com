// ===================================
// Ki-Aikido Prato - Main JavaScript
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initVideoModal();
    initContactForm();
    initScrollAnimations();
    initRanking();
    initEvents();
});

// ===================================
// Mobile Navigation
// ===================================

function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (!navToggle || !navMenu) return;

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when clicking a link
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Highlight current page in nav
    const currentPath = window.location.pathname;
    navMenu.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath.includes(href) && href !== '/') {
            link.classList.add('active');
        } else if (currentPath === '/' && href === '/') {
            link.classList.add('active');
        }
    });
}

// ===================================
// Video Modal
// ===================================

function initVideoModal() {
    const modal = document.getElementById('videoModal');
    if (!modal) return;

    const videoPlayer = document.getElementById('videoPlayer');
    const videoTitle = document.getElementById('videoTitle');
    const closeBtn = document.getElementById('closeModal');

    // Open modal on click
    document.addEventListener('click', (e) => {
        const videoElement = e.target.closest('[data-video]');
        if (!videoElement) return;

        const videoFile = videoElement.dataset.video;
        const title = videoElement.dataset.title || '';
        const baseUrl = videoElement.dataset.baseUrl || '/video/';

        videoPlayer.src = baseUrl + encodeURIComponent(videoFile);
        videoTitle.textContent = title;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        videoPlayer.play().catch(() => {});
    });

    // Close modal
    function closeModal() {
        modal.classList.remove('active');
        videoPlayer.pause();
        videoPlayer.src = '';
        document.body.style.overflow = '';
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// ===================================
// Contact Form
// ===================================

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Invio in corso...';
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            // If using Formspree or similar service
            const action = form.getAttribute('action');
            if (action) {
                const response = await fetch(action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    showFormMessage('success', 'Messaggio inviato con successo! Ti risponderemo al più presto.');
                    form.reset();
                } else {
                    throw new Error('Errore nell\'invio');
                }
            } else {
                // Demo mode - just show success
                console.log('Form data:', data);
                showFormMessage('success', 'Messaggio inviato con successo! Ti risponderemo al più presto.');
                form.reset();
            }
        } catch (error) {
            showFormMessage('error', 'Si è verificato un errore. Riprova più tardi o contattaci telefonicamente.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

function showFormMessage(type, message) {
    // Remove existing message
    const existingMsg = document.querySelector('.form-message');
    if (existingMsg) existingMsg.remove();

    const msgDiv = document.createElement('div');
    msgDiv.className = `form-message form-message-${type}`;
    msgDiv.textContent = message;
    msgDiv.style.cssText = `
        padding: 1rem 1.5rem;
        margin-bottom: 1.5rem;
        border-radius: 4px;
        font-size: 0.9rem;
        animation: fadeIn 0.3s ease-out;
        ${type === 'success' 
            ? 'background: rgba(76, 175, 80, 0.1); color: #2e7d32; border: 1px solid rgba(76, 175, 80, 0.3);'
            : 'background: rgba(244, 67, 54, 0.1); color: #c62828; border: 1px solid rgba(244, 67, 54, 0.3);'
        }
    `;

    const form = document.getElementById('contactForm');
    form.parentNode.insertBefore(msgDiv, form);

    // Auto remove after 5 seconds
    setTimeout(() => {
        msgDiv.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => msgDiv.remove(), 300);
    }, 5000);
}

// ===================================
// Scroll Animations
// ===================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ===================================
// Ranking Page
// ===================================

function initRanking() {
    const container = document.getElementById('rankingContainer');
    if (!container) return;

    // Database dei praticanti
    const members = [
        // Dan
        { name: 'Piero Messeri', grade: '7° Dan', type: 'dan', level: 7, photo: 'piero-messeri.jpg' },
        { name: 'Mara Montano', grade: '5° Dan', type: 'dan', level: 5, photo: 'mara-montano.jpg' },
        { name: 'Vittorio Cirri', grade: '5° Dan', type: 'dan', level: 5, photo: 'vittorio-cirri.jpg' },
        { name: 'William Ducceschi', grade: '3° Dan', type: 'dan', level: 3, photo: 'william-ducceschi.jpg', photoPosition: 'top' },
        { name: 'Giovanni Melani', grade: '2° Dan', type: 'dan', level: 2, photo: 'giovanni-melani.jpg' },
        { name: 'Giuseppe Scocozza', grade: '2° Dan', type: 'dan', level: 2, photo: 'giuseppe-scocozza.jpg' },
        { name: 'Gianluca Clemente', grade: '3° Dan', type: 'dan', level: 3, photo: 'gianluca-clemente.jpg', photoPosition: 'top' },
        { name: 'Simone Gosetto', grade: '1° Dan', type: 'dan', level: 1, photo: 'simone-gosetto.jpg', photoPosition: 'top' }
    ];

    // Raggruppa per livello
    const groupedMembers = {};
    members.forEach(member => {
        const key = `${member.type}-${member.level}`;
        if (!groupedMembers[key]) {
            groupedMembers[key] = [];
        }
        groupedMembers[key].push(member);
    });

    // Ordina i gruppi dal grado più alto al più basso
    const sortedGroups = Object.keys(groupedMembers).sort((a, b) => {
        const [typeA, levelA] = a.split('-');
        const [typeB, levelB] = b.split('-');

        // Dan prima di Kyu
        if (typeA !== typeB) {
            return typeA === 'dan' ? -1 : 1;
        }

        // Per Dan: dal più alto al più basso (7 > 1)
        if (typeA === 'dan') {
            return parseInt(levelB) - parseInt(levelA);
        }

        // Per Kyu: dal più alto al più basso (1 > 5)
        return parseInt(levelA) - parseInt(levelB);
    });

    // Genera HTML per ogni gruppo
    sortedGroups.forEach(groupKey => {
        const members = groupedMembers[groupKey];
        const firstMember = members[0];
        const isDan = firstMember.type === 'dan';

        // Titoli in giapponese per i Dan
        const danTitles = {
            7: 'Shichi-dan',
            6: 'Roku-dan',
            5: 'Go-dan',
            4: 'Yon-dan',
            3: 'San-dan',
            2: 'Ni-dan',
            1: 'Sho-dan'
        };

        const gradeTitle = isDan
            ? `${danTitles[firstMember.level]} (${firstMember.grade})`
            : firstMember.grade;

        const section = document.createElement('section');
        section.className = `grade-section fade-in`;

        section.innerHTML = `
            <div class="grade-header ${isDan ? 'dan' : 'kyu'}">
                <div class="grade-badge">${firstMember.level}${isDan ? '段' : '級'}</div>
                <h2 class="grade-title">${gradeTitle}</h2>
                <span class="grade-count">${members.length} ${members.length === 1 ? 'praticante' : 'praticanti'}</span>
            </div>
            <div class="members-grid">
                ${members.map(member => `
                    <div class="member-card">
                        <div class="member-photo">
                            <img src="/img/ranking/${member.photo}" alt="${member.name} - ${member.grade} Ki-Aikido Prato" loading="lazy" class="${member.photoPosition ? 'photo-' + member.photoPosition : ''}" onerror="this.parentElement.innerHTML='<span class=\\'member-photo-placeholder\\'>${member.name.split(' ').map(n => n[0]).join('')}</span>'">
                        </div>
                        <div class="member-info">
                            <div class="member-name">${member.name}</div>
                            <div class="member-grade ${isDan ? 'dan' : 'kyu'}">${member.grade}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(section);
    });

    // Anima gli elementi quando appaiono
    initScrollAnimations();
}

// ===================================
// Events Section
// ===================================

// Chiave e durata della cache locale: Apps Script e' lento, mostriamo subito
// l'ultima lista valida e poi rivalidiamo in background.
const EVENTS_CACHE_KEY = 'kiaikido_events_cache';
const EVENTS_CACHE_MAX_AGE = 6 * 60 * 60 * 1000; // 6 ore

// Escape dei valori che arrivano dal foglio Google: finiscono in innerHTML
// e il foglio e' modificabile da piu' persone.
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Accetta solo URL assoluti http(s); qualsiasi altro schema viene ignorato
function safeExternalUrl(value) {
    const url = typeof value === 'string' ? value.trim() : '';
    return /^https?:\/\//i.test(url) ? url : '';
}

// Converte 'YYYY-MM-DD' in una data locale a mezzanotte (evita gli scarti di fuso)
function parseEventDate(value) {
    if (typeof value !== 'string') return null;
    const parts = value.trim().slice(0, 10).split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
}

function readEventsCache() {
    try {
        const raw = localStorage.getItem(EVENTS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.events)) return null;
        return { savedAt: Number(parsed.savedAt) || 0, events: parsed.events };
    } catch (error) {
        // localStorage non disponibile o dato corrotto: la cache e' opzionale
        return null;
    }
}

function writeEventsCache(events) {
    try {
        localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify({
            savedAt: Date.now(),
            events: events
        }));
    } catch (error) {
        // In navigazione privata localStorage puo' lanciare: ignoriamo
    }
}

function showEventsMessage(container, message) {
    container.innerHTML = `<p style="text-align: center; color: var(--stone-gray);">${escapeHtml(message)}</p>`;
}

// Un evento resta visibile finche' la sua data di FINE non e' passata
function getUpcomingEvents(events) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
        .filter(event => {
            if (!event) return false;
            // Senza data di inizio valida la riga non e' renderizzabile: scartala
            const startDate = parseEventDate(event.date);
            if (startDate === null) return false;
            const endDate = parseEventDate(event.dateEnd) || startDate;
            return endDate >= today;
        })
        .sort((a, b) => {
            const dateA = parseEventDate(a.date);
            const dateB = parseEventDate(b.date);
            if (!dateA || !dateB) return 0;
            return dateA - dateB;
        })
        .slice(0, 5); // Mostra max 5 eventi
}

function renderEvents(container, events) {
    const upcomingEvents = getUpcomingEvents(events);

    if (upcomingEvents.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--stone-gray); font-size: 1rem;">Nessun evento in programma al momento. Controlla più avanti per nuovi seminari e stage!</p>';
        return;
    }

    container.innerHTML = upcomingEvents.map((event, index) => {
        const startDate = parseEventDate(event.date);
        if (!startDate) return '';
        const endDate = parseEventDate(event.dateEnd);
        const isMultiDay = endDate !== null && startDate !== null && endDate > startDate;

        const day = startDate.getDate();
        const month = startDate.toLocaleDateString('it-IT', { month: 'short' });
        const year = startDate.getFullYear();
        const weekday = startDate.toLocaleDateString('it-IT', { weekday: 'long' });

        // Blocco data: per gli eventi su piu' giorni mostra l'intervallo (es. "15-16")
        let dayLabel = String(day);
        let monthLabel = `${month} ${year}`;
        if (isMultiDay) {
            const endMonth = endDate.toLocaleDateString('it-IT', { month: 'short' });
            const endYear = endDate.getFullYear();
            dayLabel = `${day}-${endDate.getDate()}`;
            if (year !== endYear) {
                monthLabel = `${month} ${year} - ${endMonth} ${endYear}`;
            } else if (month !== endMonth) {
                monthLabel = `${month}-${endMonth} ${year}`;
            }
        }

        // Riga di dettaglio: giorno singolo oppure intervallo di date
        let whenLabel;
        if (isMultiDay) {
            const startWeekday = weekday;
            const endWeekday = endDate.toLocaleDateString('it-IT', { weekday: 'long' });
            const endMonthLong = endDate.toLocaleDateString('it-IT', { month: 'long' });
            const startMonthLong = startDate.toLocaleDateString('it-IT', { month: 'long' });
            const startPart = startDate.getMonth() === endDate.getMonth() && year === endDate.getFullYear()
                ? `${startWeekday} ${day}`
                : `${startWeekday} ${day} ${startMonthLong}`;
            whenLabel = `Da ${startPart} a ${endWeekday} ${endDate.getDate()} ${endMonthLong}`;
        } else {
            whenLabel = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        }

        const title = escapeHtml(event.title);
        const imageUrl = safeExternalUrl(event.image);
        const linkUrl = safeExternalUrl(event.link);
        // Luogo e descrizione possono arrivare vuoti dal foglio: in quel caso non emettiamo il markup
        const location = event.location === null || event.location === undefined ? '' : String(event.location).trim();
        const description = event.description === null || event.description === undefined ? '' : String(event.description).trim();

        return `
            <div class="event-accordion ${imageUrl ? 'has-image' : ''}" data-event-id="${index}">
                <div class="event-accordion-header">
                    <div class="event-date">
                        <div class="event-date-day${isMultiDay ? ' event-date-range' : ''}">${escapeHtml(dayLabel)}</div>
                        <div class="event-date-month">${escapeHtml(monthLabel)}</div>
                    </div>
                    <div class="event-info">
                        <h3>${title}</h3>
                        <p class="event-details-short">
                            📅 ${escapeHtml(whenLabel)}${location ? ` • 📍 ${escapeHtml(location)}` : ''}
                        </p>
                    </div>
                    <button class="event-toggle" aria-label="Mostra dettagli" aria-expanded="false">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="event-accordion-content">
                    ${imageUrl ? `
                    <div class="event-image-wrapper">
                        <img src="${escapeHtml(imageUrl)}" alt="${title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                    </div>
                    ` : ''}
                    <div class="event-details-full">
                        ${description ? `<p class="event-description">${escapeHtml(description)}</p>` : ''}
                        <div class="event-meta">
                            ${isMultiDay ? `<p><strong>📆 Date:</strong> ${escapeHtml(whenLabel)}</p>` : ''}
                            <p><strong>🕐 Orario:</strong> ${escapeHtml(event.time || 'Da definire')}</p>
                            ${event.organizer ? `<p><strong>👤 Insegnanti:</strong> ${escapeHtml(event.organizer)}</p>` : ''}
                        </div>
                        ${linkUrl ? `
                        <a href="${escapeHtml(linkUrl)}" class="btn btn-outline" target="_blank" rel="noopener">Maggiori Info</a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Aggiungi event listeners per accordion
    container.querySelectorAll('.event-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const accordion = button.closest('.event-accordion');
            const isExpanded = accordion.classList.contains('active');

            // Chiudi tutti gli altri accordion
            document.querySelectorAll('.event-accordion.active').forEach(acc => {
                if (acc !== accordion) {
                    acc.classList.remove('active');
                    acc.querySelector('.event-toggle').setAttribute('aria-expanded', 'false');
                }
            });

            // Toggle questo accordion
            accordion.classList.toggle('active');
            button.setAttribute('aria-expanded', !isExpanded);
        });
    });
}

async function initEvents() {
    const container = document.querySelector('.events-container');
    if (!container) return;

    const config = window.KIAIKIDO_CONFIG || {};
    const apiUrl = typeof config.eventsApiUrl === 'string' ? config.eventsApiUrl.trim() : '';

    if (!apiUrl) {
        showEventsMessage(container, 'Il calendario eventi non è ancora configurato. Torna a trovarci tra poco!');
        return;
    }

    // Mostra subito la copia locale se e' recente, poi rivalida in background
    const cached = readEventsCache();
    let renderedEvents = null;
    if (cached && (Date.now() - cached.savedAt) < EVENTS_CACHE_MAX_AGE) {
        renderedEvents = cached.events;
        renderEvents(container, renderedEvents);
    }

    try {
        const response = await fetch(apiUrl + '?action=list', { cache: 'no-store' });
        const payload = await response.json();

        if (!payload || payload.ok !== true) {
            // Errore lato Apps Script: resta un problema tecnico, non un messaggio per i visitatori
            console.warn('Eventi: risposta non valida',
                payload && payload.code ? payload.code : 'unknown',
                payload && payload.error ? payload.error : '');
            if (renderedEvents) return;
            if (cached) {
                renderEvents(container, cached.events);
                return;
            }
            showEventsMessage(container, 'Errore nel caricamento degli eventi. Riprova più tardi.');
            return;
        }

        const events = Array.isArray(payload.events) ? payload.events : [];
        writeEventsCache(events);

        // Re-renderizza solo se i dati sono cambiati rispetto alla cache mostrata
        if (renderedEvents && JSON.stringify(renderedEvents) === JSON.stringify(events)) return;
        renderEvents(container, events);
    } catch (error) {
        // Rete non disponibile: meglio la cache (anche vecchia) di un errore
        if (renderedEvents) return;
        if (cached) {
            renderEvents(container, cached.events);
            return;
        }
        showEventsMessage(container, 'Errore nel caricamento degli eventi. Riprova più tardi.');
    }
}

// ===================================
// Utility Functions
// ===================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
