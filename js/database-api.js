const SUPABASE_URL = 'https://qjobrkzefvheypzlwpex.supabase.co'; // TODO: Añadir URL de Supabase
const SUPABASE_ANON_KEY = 'sb_publishable_UYSfhDQhHcXM4IQt5t_H2Q_b4yXsEeV'; // TODO: Añadir Anon Key de Supabase

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Mock Data for Prototype
const MOCK_DB = {
    events: [
        { id: 1, name: "Workshop ALAS - Medellín" },
        { id: 2, name: "Workshop ALAS - Panamá" }
    ],
    sponsors: [
        { id: 1, event_id: 1, name: "Sponsor Oro", logo: "https://via.placeholder.com/100/FFD700", tier: "gold", question: "¿Cuál es nuestro producto estrella?", options: ["Cámara 360", "Sensor de humo", "Alarma básica"], correct: 0, points: 200 },
        { id: 2, event_id: 1, name: "Sponsor Plata", logo: "https://via.placeholder.com/100/C0C0C0", tier: "silver", question: "¿Año de fundación?", options: ["1990", "2000", "2010"], correct: 1, points: 100 },
        { id: 3, event_id: 1, name: "Sponsor Bronce", logo: "https://via.placeholder.com/100/CD7F32", tier: "bronze", question: "¿Oficina principal?", options: ["Miami", "Bogotá", "Lima"], correct: 1, points: 50 }
    ],
    users: [], // { id, event_id, name, company, email, total_points, activities: [] }
};

const dbAPI = {
    async getEvents() {
        if (supabase) {
            const { data, error } = await supabase.from('events').select('*');
            if (error) console.error(error);
            return data || [];
        }
        return new Promise(res => setTimeout(() => res(MOCK_DB.events), 500));
    },

    async getSponsors(eventId) {
        if (supabase) {
            const { data, error } = await supabase.from('sponsors').select('*').eq('event_id', eventId);
            if (error) console.error(error);
            return data || [];
        }
        return new Promise(res => setTimeout(() => res(MOCK_DB.sponsors.filter(s => s.event_id == eventId)), 500));
    },

    async loginUser(eventId, name, company, email) {
        if (supabase) {
            // Check if exists
            let { data: users } = await supabase.from('users').select('*').eq('email', email).eq('event_id', eventId);
            if (users && users.length > 0) return users[0];
            
            // Create new
            const { data, error } = await supabase.from('users').insert([{
                event_id: eventId, name, company, email, total_points: 0, start_time: new Date().toISOString()
            }]).select();
            return data ? data[0] : null;
        }
        
        return new Promise(res => {
            setTimeout(() => {
                let user = MOCK_DB.users.find(u => u.email === email && u.event_id == eventId);
                if (!user) {
                    user = {
                        id: Date.now(),
                        event_id: eventId,
                        name, company, email,
                        total_points: 0,
                        activities: []
                    };
                    MOCK_DB.users.push(user);
                }
                res(user);
            }, 500);
        });
    },

    async registerActivity(userId, type, points, sponsorId = null) {
        if (supabase) {
            await supabase.from('user_activities').insert([{
                user_id: userId, activity_type: type, points, sponsor_id: sponsorId
            }]);
            
            // Update total
            const { data: user } = await supabase.from('users').select('total_points').eq('id', userId).single();
            await supabase.from('users').update({ total_points: user.total_points + points }).eq('id', userId);
            return;
        }

        return new Promise(res => {
            setTimeout(() => {
                let user = MOCK_DB.users.find(u => u.id === userId);
                if (user) {
                    user.activities.push({ type, sponsorId, points });
                    user.total_points += points;
                }
                res();
            }, 300);
        });
    },

    async getUserActivities(userId) {
        if (supabase) {
            const { data } = await supabase.from('user_activities').select('*').eq('user_id', userId);
            return data || [];
        }
        return new Promise(res => {
            setTimeout(() => {
                let user = MOCK_DB.users.find(u => u.id === userId);
                res(user ? user.activities : []);
            }, 300);
        });
    },

    async getLeaderboard(eventId) {
        if (supabase) {
            const { data } = await supabase.from('users')
                                    .select('name, company, total_points')
                                    .eq('event_id', eventId)
                                    .order('total_points', { ascending: false })
                                    .order('start_time', { ascending: true }); // Tie-breaker
            return data || [];
        }
        return new Promise(res => {
            setTimeout(() => {
                let users = MOCK_DB.users.filter(u => u.event_id == eventId);
                users.sort((a, b) => b.total_points - a.total_points);
                res(users);
            }, 500);
        });
    }
};

window.dbAPI = dbAPI;
