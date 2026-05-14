const adminApp = {
    isAuthenticated: false,

    init() {
        document.getElementById('admin-login-form').addEventListener('submit', (e) => this.handleLogin(e));
    },

    handleLogin(e) {
        e.preventDefault();
        const user = document.getElementById('admin-user').value;
        const pass = document.getElementById('admin-pass').value;

        if (user === 'alexjemo@gmail.com' && pass === '800621') {
            this.isAuthenticated = true;
            document.getElementById('admin-login-section').classList.add('hidden');
            document.getElementById('admin-dash-section').classList.remove('hidden');
            this.switchTab('events');
        } else {
            alert('Credenciales incorrectas');
        }
    },

    logout() {
        this.isAuthenticated = false;
        document.getElementById('admin-login-section').classList.remove('hidden');
        document.getElementById('admin-dash-section').classList.add('hidden');
        document.getElementById('admin-login-form').reset();
    },

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        const content = document.getElementById('admin-content-area');
        content.innerHTML = '';

        if (tabName === 'events') {
            this.renderEventsTab(content);
        } else if (tabName === 'sponsors') {
            this.renderSponsorsTab(content);
        } else if (tabName === 'leaderboard') {
            this.renderLeaderboardTab(content);
        }
    },

    async renderEventsTab(container) {
        container.innerHTML = '<h3>Eventos Disponibles</h3><p class="subtitle">Mockup de gestión de eventos</p>';
        const events = await dbAPI.getEvents();
        
        events.forEach(ev => {
            const el = document.createElement('div');
            el.className = 'glass-card mb-2';
            el.style.textAlign = 'left';
            el.innerHTML = `<strong>${ev.name}</strong> <span style="float:right; font-size: 12px; color: var(--primary-blue); cursor:pointer;">Editar</span>`;
            container.appendChild(el);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary mt-4';
        addBtn.textContent = '+ Crear Nuevo Evento';
        addBtn.onclick = () => alert("Creación de eventos no implementada en mockup.");
        container.appendChild(addBtn);
    },

    async renderSponsorsTab(container) {
        container.innerHTML = '<h3>Gestión de Sponsors</h3><p class="subtitle">Mockup de gestión de sponsors del Evento 1</p>';
        const sponsors = await dbAPI.getSponsors(1); // Hardcoded to event 1 for demo
        
        sponsors.forEach(s => {
            const el = document.createElement('div');
            el.className = 'sponsor-card';
            el.innerHTML = `
                <img src="${s.logo}" class="sponsor-logo">
                <div class="sponsor-info" style="text-align: left;">
                    <h3>${s.name} <span class="tier-badge tier-${s.tier}" style="font-size: 8px;">${s.tier}</span></h3>
                    <p>Pregunta: ${s.question}</p>
                </div>
            `;
            container.appendChild(el);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary mt-4';
        addBtn.textContent = '+ Agregar Sponsor';
        addBtn.onclick = () => alert("Agregado de sponsors no implementado en mockup.");
        container.appendChild(addBtn);
    },

    async renderLeaderboardTab(container) {
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>Ranking / Leaderboard</h3>
                <button class="btn btn-secondary" style="width: auto; padding: 5px 10px;" onclick="adminApp.renderLeaderboardTab(document.getElementById('admin-content-area'))"><i class="ph ph-arrows-clockwise"></i></button>
            </div>
        `;
        
        // Let's assume we want leaderboard for event 1
        const users = await dbAPI.getLeaderboard(1);
        
        if (users.length === 0) {
            container.innerHTML += '<p style="text-align:center; color: #666;">No hay usuarios registrados aún.</p>';
            return;
        }

        users.forEach((u, index) => {
            const el = document.createElement('div');
            el.className = 'leaderboard-item';
            el.innerHTML = `
                <div class="lb-rank">#${index + 1}</div>
                <div class="lb-info">
                    <div class="lb-name">${u.name}</div>
                    <div class="lb-company">${u.company}</div>
                </div>
                <div class="lb-points">${u.total_points} pts</div>
            `;
            container.appendChild(el);
        });
    }
};

window.addEventListener('DOMContentLoaded', () => {
    adminApp.init();
});
