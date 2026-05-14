const app = {
    currentUser: null,
    currentEventId: null,
    sponsors: [],
    activities: [],

    init() {
        if (window.location.hash === '#admin' || window.location.search.includes('admin=true')) {
            this.showView('view-admin');
        } else {
            this.loadEvents();
        }
        
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    },

    showView(viewId, ...args) {
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('active-view');
            setTimeout(() => el.classList.add('hidden'), 300);
        });
        
        const target = document.getElementById(viewId);
        target.classList.remove('hidden');
        setTimeout(() => target.classList.add('active-view'), 50);

        if (viewId === 'view-extra' && args.length > 0) {
            this.renderExtraChallenge(args[0]);
        }
    },

    async loadEvents() {
        try {
            const events = await dbAPI.getEvents();
            if (events && Array.isArray(events) && events.length > 0) {
                const list = document.getElementById('events-list');
                list.innerHTML = '';
                events.forEach(ev => {
                    const card = document.createElement('div');
                    card.className = 'event-card';
                    const location = ev.location || ev.name.split(' - ')[1] || 'ALAS';
                    card.innerHTML = `
                        <div class="event-card-info">
                            <h3>${ev.name.split(' - ')[0]}</h3>
                            <p>${location}</p>
                        </div>
                        <i class="ph ph-map-pin"></i>
                    `;
                    card.onclick = () => {
                        this.currentEventId = ev.id;
                        document.getElementById('register-event-name').textContent = 'WORKSHOP ' + location.toUpperCase();
                        this.showView('view-register');
                    };
                    list.appendChild(card);
                });
            } else {
                console.warn("No events loaded or events is not an array");
                document.getElementById('events-list').innerHTML = '<p style="color:#d9534f; text-align:center; padding:20px; font-weight:bold; font-size:12px;">No se encontraron eventos o están siendo bloqueados por tu navegador (revisa si tienes AdBlocker activado).</p>';
            }
        } catch (e) {
            console.error("Failed to load events", e);
            document.getElementById('events-list').innerHTML = '<p style="color:#d9534f; text-align:center; padding:20px; font-weight:bold; font-size:12px;">Error en JS: ' + e.message + '</p>';
        } finally {
            this.showView('view-events');
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const eventId = this.currentEventId;
        const name = document.getElementById('user-name').value;
        const company = document.getElementById('user-company').value;
        const email = document.getElementById('user-email').value;

        if (!eventId || !name || !email) return;

        const btn = document.getElementById('btn-submit-register');
        const origText = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin" style="font-size: 24px;"></i>';
        
        try {
            this.currentUser = await dbAPI.loginUser(eventId, name, company, email);
            await this.loadDashboardData();
            this.showView('view-dashboard');
        } catch (e) {
            console.error("Login failed", e);
            alert("Error al iniciar sesión.");
            this.showView('view-register');
        } finally {
            btn.innerHTML = origText;
        }
    },

    async loadDashboardData() {
        this.sponsors = await dbAPI.getSponsors(this.currentEventId);
        this.activities = await dbAPI.getUserActivities(this.currentUser.id);
        
        // Update user info
        document.getElementById('dash-name').textContent = this.currentUser.name;
        
        // Use the selected option's text for event name
        const selectEl = document.getElementById('event-select');
        document.getElementById('dash-event').textContent = selectEl.options[selectEl.selectedIndex].text;
        
        // Calculate total points from activities or use user total
        let points = this.currentUser.total_points || 0;
        document.getElementById('dash-points').textContent = points;

        this.renderSponsors();
    },

    renderSponsors() {
        const container = document.getElementById('sponsors-list');
        container.innerHTML = '';
        
        // Sort: Gold -> Silver -> Bronze
        const tierOrder = { 'gold': 1, 'silver': 2, 'bronze': 3 };
        const sorted = [...this.sponsors].sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

        sorted.forEach(s => {
            const isCompleted = this.activities.some(act => act.sponsorId === s.id && act.type === 'sponsor_quiz');
            
            const card = document.createElement('div');
            card.className = `sponsor-card ${isCompleted ? 'completed' : ''}`;
            if (!isCompleted) {
                card.onclick = () => this.openQuiz(s);
            }

            let tierClass = `tier-${s.tier}`;
            let tierName = s.tier === 'gold' ? 'ORO' : (s.tier === 'silver' ? 'PLATA' : 'BRONCE');
            
            card.innerHTML = `
                <img src="${s.logo}" class="sponsor-logo" alt="${s.name}" onerror="this.src='https://via.placeholder.com/50'">
                <div class="sponsor-info">
                    <h3>${s.name}</h3>
                    <p><span class="tier-badge ${tierClass}">${tierName}</span> • ${s.points} pts</p>
                </div>
                <div>
                    ${isCompleted ? '<i class="ph ph-check-circle" style="color: #28a745; font-size: 24px;"></i>' : '<i class="ph ph-caret-right" style="color: var(--primary-blue);"></i>'}
                </div>
            `;
            container.appendChild(card);
        });
    },

    openQuiz(sponsor) {
        document.getElementById('quiz-sponsor-name').textContent = sponsor.name;
        document.getElementById('quiz-sponsor-logo').src = sponsor.logo;
        document.getElementById('quiz-question').textContent = sponsor.question;
        
        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.innerHTML = '';
        
        const feedback = document.getElementById('quiz-feedback');
        feedback.className = 'feedback-msg hidden';

        sponsor.options.forEach((optText, index) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = optText;
            btn.onclick = () => this.submitQuiz(sponsor, index, btn);
            optionsContainer.appendChild(btn);
        });

        this.showView('view-sponsor');
    },

    async submitQuiz(sponsor, selectedIndex, btnElement) {
        // Disable all buttons
        const btns = document.querySelectorAll('.quiz-option');
        btns.forEach(b => b.disabled = true);

        const feedback = document.getElementById('quiz-feedback');
        feedback.classList.remove('hidden');

        if (selectedIndex === sponsor.correct) {
            btnElement.classList.add('correct');
            feedback.textContent = `¡Correcto! Has ganado ${sponsor.points} puntos.`;
            feedback.className = 'feedback-msg success';
            
            await dbAPI.registerActivity(this.currentUser.id, 'sponsor_quiz', sponsor.points, sponsor.id);
            this.currentUser.total_points += sponsor.points;
            
            setTimeout(() => {
                this.loadDashboardData();
                this.showView('view-dashboard');
            }, 2000);
        } else {
            btnElement.classList.add('wrong');
            // Show correct answer
            btns[sponsor.correct].classList.add('correct');
            feedback.textContent = 'Respuesta incorrecta. ¡Sigue intentando con otros patrocinadores!';
            feedback.className = 'feedback-msg error';
            
            // Still register activity with 0 points to mark as completed (or let them retry based on rules. Rules say "no permite generar oportunidad, queda ligada al usuario")
            await dbAPI.registerActivity(this.currentUser.id, 'sponsor_quiz', 0, sponsor.id);
            
            setTimeout(() => {
                this.loadDashboardData();
                this.showView('view-dashboard');
            }, 3000);
        }
    },

    renderExtraChallenge(type) {
        const titleEl = document.getElementById('extra-title');
        const contentEl = document.getElementById('extra-content');
        contentEl.innerHTML = '';

        // Check if already completed
        const isCompleted = this.activities.some(act => act.type === type);
        
        if (isCompleted) {
            titleEl.textContent = "Reto Completado";
            contentEl.innerHTML = `
                <i class="ph ph-check-circle" style="font-size: 80px; color: #28a745; margin-bottom: 20px;"></i>
                <h3 style="text-align: center;">Ya completaste este reto.</h3>
                <button class="btn btn-primary mt-4" onclick="app.showView('view-dashboard')">Volver</button>
            `;
            return;
        }

        let config = {};
        if (type === 'social') config = { title: "Foto en Redes", pts: 50, icon: "ph-instagram-logo", text: "Toma una foto en el evento y compártela. Luego valida aquí para ganar puntos." };
        if (type === 'colleague') config = { title: "Foto con Colega", pts: 50, icon: "ph-users", text: "Tómate una foto con ese colega que no veías hace tiempo." };
        if (type === 'card') config = { title: "Tarjeta Presentación", pts: 50, icon: "ph-address-book", text: "Toma foto a la tarjeta de un expositor para guardar su contacto." };
        
        if (type === 'survey') {
            titleEl.textContent = "Encuesta";
            contentEl.innerHTML = `
                <div class="survey-section">
                    <p>A. Salón de exposiciones y conferencias</p>
                    <div class="stars" id="stars-A">
                        <i class="ph-fill ph-star" onclick="app.rate('A',1)"></i><i class="ph-fill ph-star" onclick="app.rate('A',2)"></i><i class="ph-fill ph-star" onclick="app.rate('A',3)"></i><i class="ph-fill ph-star" onclick="app.rate('A',4)"></i><i class="ph-fill ph-star" onclick="app.rate('A',5)"></i>
                    </div>
                </div>
                <div class="survey-section">
                    <p>B. Evaluación de las charlas</p>
                    <div class="stars" id="stars-B">
                        <i class="ph-fill ph-star" onclick="app.rate('B',1)"></i><i class="ph-fill ph-star" onclick="app.rate('B',2)"></i><i class="ph-fill ph-star" onclick="app.rate('B',3)"></i><i class="ph-fill ph-star" onclick="app.rate('B',4)"></i><i class="ph-fill ph-star" onclick="app.rate('B',5)"></i>
                    </div>
                </div>
                <div class="survey-section">
                    <p>C. Evento en general</p>
                    <div class="stars" id="stars-C">
                        <i class="ph-fill ph-star" onclick="app.rate('C',1)"></i><i class="ph-fill ph-star" onclick="app.rate('C',2)"></i><i class="ph-fill ph-star" onclick="app.rate('C',3)"></i><i class="ph-fill ph-star" onclick="app.rate('C',4)"></i><i class="ph-fill ph-star" onclick="app.rate('C',5)"></i>
                    </div>
                </div>
                <div class="survey-section">
                    <p>D. Opinión</p>
                    <textarea placeholder="Escribe tu opinión aquí..."></textarea>
                </div>
                <button class="btn btn-primary mt-4" onclick="app.completeExtra('survey', 100)">Enviar Encuesta (+100 pts)</button>
            `;
            return;
        }

        // Default camera/upload flow
        titleEl.textContent = config.title;
        contentEl.innerHTML = `
            <div class="glass-card" style="margin-top: 20px;">
                <i class="ph ${config.icon}" style="font-size: 60px; color: var(--primary-blue); margin-bottom: 10px;"></i>
                <p style="margin-bottom: 20px;">${config.text}</p>
                
                <input type="file" id="camera-input" accept="image/*" capture="camera" style="display: none;" onchange="document.getElementById('upload-btn').classList.remove('hidden')">
                <button class="btn btn-secondary mb-2" onclick="document.getElementById('camera-input').click()">
                    <i class="ph ph-camera"></i> Tomar/Subir Foto
                </button>
                
                <button id="upload-btn" class="btn btn-primary hidden mt-4" onclick="app.completeExtra('${type}', ${config.pts})">
                    Validar y Ganar +${config.pts} pts
                </button>
            </div>
        `;
    },

    rate(section, value) {
        const stars = document.getElementById(`stars-${section}`).children;
        for(let i=0; i<5; i++) {
            if(i < value) stars[i].classList.add('active');
            else stars[i].classList.remove('active');
        }
    },

    async completeExtra(type, points) {
        this.showView('view-loading');
        await dbAPI.registerActivity(this.currentUser.id, type, points);
        this.currentUser.total_points += points;
        await this.loadDashboardData();
        
        setTimeout(() => {
            alert(`¡Felicidades! Has ganado ${points} puntos extra.`);
            this.showView('view-dashboard');
        }, 500);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
