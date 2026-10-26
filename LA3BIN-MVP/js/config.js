// =========================================================================
// 1. INITIALISATION SUPABASE & CONFIGURATIONS GLOBALES
// =========================================================================
const supabaseUrl = 'https://elrimadnclaawodmrsam.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscmltYWRuY2xhYXdvZG1yc2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MDAyMDQsImV4cCI6MjEwODA3NjIwNH0.c0iNkxIolVuAKBg9xDeQx2Ac_yA-qxbRmI3RkweNPRo';
window.db = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

const CONFIG_AVATARS = [
    { name: "Moi", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=f4f4f5" },
    { name: "Karim", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=f4f4f5" },
    { name: "Mehdi", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=f4f4f5" },
    { name: "Youssef", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn&backgroundColor=f4f4f5" },
    { name: "Gamer", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Gamer&backgroundColor=e4e4e7" },
    { name: "Sportif", url: "https://api.dicebear.com/7.x/initials/svg?seed=SP&backgroundColor=3f3f46" }
];

const SPORT_CONFIG = {
    'Football': { cardBg: 'bg-[#ecfdf5]', cardBorder: 'border-[#d1fae5]', iconBg: 'bg-white', text: 'text-[#0f766e]', badgeBg: 'bg-[#0f766e]', icon: 'fa-futbol', label: 'Football', subGames: [{ name: 'Foot 5v5 Urbain', defaultPlayers: 3 }, { name: 'Foot 7v7 Demi-Terrain', defaultPlayers: 5 }, { name: 'Foot 11v11 Grand Terrain', defaultPlayers: 8 }] },
    'Basketball': { cardBg: 'bg-[#fef2f2]', cardBorder: 'border-[#fee2e2]', iconBg: 'bg-white', text: 'text-[#dc2626]', badgeBg: 'bg-[#dc2626]', icon: 'fa-basketball', label: 'Basketball', subGames: [{ name: 'Basket 3x3', defaultPlayers: 2 }, { name: 'Basket 5x5', defaultPlayers: 4 }, { name: 'Match Urbain', defaultPlayers: 3 }] },
    'Volleyball': { cardBg: 'bg-[#f0fdf4]', cardBorder: 'border-[#bbf7d0]', iconBg: 'bg-white', text: 'text-[#166534]', badgeBg: 'bg-[#15803d]', icon: 'fa-volleyball-ball', label: 'Volleyball', subGames: [{ name: 'Beach Volley', defaultPlayers: 2 }, { name: 'Volley 4x4', defaultPlayers: 3 }, { name: 'Volley Mixte', defaultPlayers: 4 }] },
    'Handball': { cardBg: 'bg-[#f5f3ff]', cardBorder: 'border-[#ddd6fe]', iconBg: 'bg-white', text: 'text-[#6d28d9]', badgeBg: 'bg-[#7c3aed]', icon: 'fa-futbol', label: 'Handball', subGames: [{ name: 'Handball 4v4', defaultPlayers: 3 }, { name: 'Handball 7v7', defaultPlayers: 5 }, { name: 'Match Amical', defaultPlayers: 4 }] },
    'Tennis': { cardBg: 'bg-[#ecfeff]', cardBorder: 'border-[#a5f3fc]', iconBg: 'bg-white', text: 'text-[#0f766e]', badgeBg: 'bg-[#0891b2]', icon: 'fa-baseball-ball', label: 'Tennis', subGames: [{ name: 'Tennis Simple', defaultPlayers: 1 }, { name: 'Tennis Double', defaultPlayers: 2 }, { name: 'Tournoi Mini', defaultPlayers: 2 }] },
    'Padel': { cardBg: 'bg-[#fffbeb]', cardBorder: 'border-[#fef3c7]', iconBg: 'bg-white', text: 'text-[#d97706]', badgeBg: 'bg-[#d97706]', icon: 'fa-table-tennis-paddle-ball', label: 'Padel', subGames: [{ name: 'Padel Double (2v2)', defaultPlayers: 2 }, { name: 'Padel Tournoi', defaultPlayers: 3 }, { name: 'Padel Entraînement', defaultPlayers: 1 }] },
    'Running': { cardBg: 'bg-[#faf5ff]', cardBorder: 'border-[#e9d5ff]', iconBg: 'bg-white', text: 'text-[#7e22ce]', badgeBg: 'bg-[#7e22ce]', icon: 'fa-running', label: 'Course à pied', subGames: [{ name: 'Footing 5km', defaultPlayers: 2 }, { name: 'Fractionné', defaultPlayers: 3 }, { name: 'Run 10km+', defaultPlayers: 4 }] },
    'Swimming': { cardBg: 'bg-[#eff6ff]', cardBorder: 'border-[#bfdbfe]', iconBg: 'bg-white', text: 'text-[#1d4ed8]', badgeBg: 'bg-[#1d4ed8]', icon: 'fa-water', label: 'Natation', subGames: [{ name: 'Natation Loisir', defaultPlayers: 2 }, { name: 'Session Endurance', defaultPlayers: 3 }, { name: 'Piscine Intervals', defaultPlayers: 2 }] },
    'Cycling': { cardBg: 'bg-[#fefce8]', cardBorder: 'border-[#fef08a]', iconBg: 'bg-white', text: 'text-[#a16207]', badgeBg: 'bg-[#ca8a04]', icon: 'fa-bicycle', label: 'Cyclisme', subGames: [{ name: 'Vélo Route', defaultPlayers: 2 }, { name: 'Sortie Urbain', defaultPlayers: 3 }, { name: 'Endurance', defaultPlayers: 2 }] },
    'Boxing': { cardBg: 'bg-[#fdf2f8]', cardBorder: 'border-[#fbcfe8]', iconBg: 'bg-white', text: 'text-[#be185d]', badgeBg: 'bg-[#db2777]', icon: 'fa-hand-fist', label: 'Boxe', subGames: [{ name: 'Boxe Cardio', defaultPlayers: 1 }, { name: 'Sparring', defaultPlayers: 2 }, { name: 'Conditionnement', defaultPlayers: 1 }] },
    'Surf': { cardBg: 'bg-[#dbeafe]', cardBorder: 'border-[#93c5fd]', iconBg: 'bg-white', text: 'text-[#1d4ed8]', badgeBg: 'bg-[#2563eb]', icon: 'fa-water', label: 'Surf', subGames: [{ name: 'Surf Session', defaultPlayers: 2 }, { name: 'Bodyboard', defaultPlayers: 2 }, { name: 'Waves Clinic', defaultPlayers: 2 }] }
};

const CLUBS_DB = [
    { name: "Oasis Padel Club", sport: "Padel", quartier: "Oasis", lat: 33.5542, lng: -7.6321, partner: true },
    { name: "CAFC Padel", sport: "Padel", quartier: "Anfa", lat: 33.5684, lng: -7.6492, partner: true },
    { name: "City Foot 5", sport: "Football", quartier: "Maarif", lat: 33.5786, lng: -7.6369, partner: true },
    { name: "Basket Arena Casa", sport: "Basketball", quartier: "Maarif", lat: 33.5796, lng: -7.6337, partner: true },
    { name: "Volley Park Oasis", sport: "Volleyball", quartier: "Oasis", lat: 33.5564, lng: -7.6418, partner: true },
    { name: "Handball Academy", sport: "Handball", quartier: "Oasis", lat: 33.5603, lng: -7.6309, partner: true },
    { name: "Côte Tennis Club", sport: "Tennis", quartier: "Anfa", lat: 33.5698, lng: -7.6478, partner: true },
    { name: "Corniche Ain Diab", sport: "Running", quartier: "Ain Diab", lat: 33.5952, lng: -7.6745, partner: false },
    { name: "Piscine Mohamed V", sport: "Swimming", quartier: "Maarif", lat: 33.5771, lng: -7.6322, partner: true },
    { name: "Casablanca Cycling Club", sport: "Cycling", quartier: "Ain Diab", lat: 33.5940, lng: -7.6695, partner: false },
    { name: "Plage Lalla Meryem", sport: "Surf", quartier: "Ain Diab", lat: 33.5960, lng: -7.6750, partner: false },
    { name: "KO Boxing Club", sport: "Boxing", quartier: "Hassan II", lat: 33.5735, lng: -7.6408, partner: true }
];

const MOROCCAN_LEVELS = [
    { id: '1', label: '1 bar', sub: 'Men 7a9i nkouuun' },
    { id: '2', label: '2 bars', sub: 'msellek' },
    { id: '3', label: '3 bars', sub: 'Nadi' }
];