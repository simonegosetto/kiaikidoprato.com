// ===================================
// Ki-Aikido Prato - Main JavaScript
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initVideoModal();
    initContactForm();
    initScrollAnimations();
    initRanking();
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
        { name: 'Gianluca Clemente', grade: '2° Dan', type: 'dan', level: 2, photo: 'gianluca-clemente.jpg', photoPosition: 'top' },
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
                            <img src="/img/ranking/${member.photo}" alt="${member.name}" loading="lazy" class="${member.photoPosition ? 'photo-' + member.photoPosition : ''}" onerror="this.parentElement.innerHTML='<span class=\\'member-photo-placeholder\\'>${member.name.split(' ').map(n => n[0]).join('')}</span>'">
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
