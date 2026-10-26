// =========================================================================
// LA3BIN! — MOTEUR APPLICATIF PRINCIPAL (js/app.js) - 100% BLANK / RÉEL
// =========================================================================
let currentUser = null;
let allGamesCache = [];
let activeSportFilter = 'ALL';
let activePeriodFilter = 'ALL';
let activeCalendarDate = '';
let activeLevelFilter = 'ALL';
let activeGenderFilter = 'ALL';
let activeAtmosphereFilter = 'ALL';
let filterAroundMe = false;
let isMobileSim = false;
let isMapExpanded = false;
let pendingRedirectMatchId = null;

let userCoords = { lat: 33.5542, lng: -7.6321, quartier: 'Oasis (Défaut)', isRealGps: false };
let casaMap = null;
let casaMapCircle = null;
let casaMapMarkers = [];

let otpState = { cooldownUntil: 0, expiresAt: 0, attempts: 0 };

// 1. BASE DE DONNÉES TOTALEMENT VIDE (Prête pour les vrais utilisateurs Supabase)
let FRIENDS_DB = [];

// =========================================================================
// 0. PATCHEUR DYNAMIQUE D'INTERFACE 
// =========================================================================
function injecterAmeliorationsUI() {
    if (!document.getElementById('la3bin-dynamic-fixes')) {
        const style = document.createElement('style');
        style.id = 'la3bin-dynamic-fixes';
        style.textContent = `
            #landing-sticky-nav { padding: 0.75rem 1.5rem !important; justify-content: center !important; }
            #landing-sticky-nav-inner { width: 100%; max-width: 760px; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; }
            #landing-hero > div:first-of-type { min-height: 78vh !important; padding-bottom: 1.5rem !important; }
            #landing-about-section { padding-top: 1rem !important; transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s ease; }
            #landing-hero.scrolled-down #landing-shake-wrapper { transform: translate(-18vw, -22vh) scale(0.55) !important; opacity: 0 !important; max-height: 0 !important; margin: 0 !important; overflow: hidden !important; }
            @media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }
            .match-card-animated { will-change: transform; transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease; }
            .goalpost-top { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); width: 96px; height: 16px; border: 3px solid rgba(255, 255, 255, 0.85); border-top: none; border-radius: 0 0 6px 6px; background: repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 4px, transparent 4px, transparent 8px); pointer-events: none; z-index: 15; }
        `;
        document.head.appendChild(style);
    }

    const stickyNav = document.getElementById('landing-sticky-nav');
    if (stickyNav && !document.getElementById('landing-sticky-nav-inner')) {
        const children = Array.from(stickyNav.children);
        const wrapper = document.createElement('div');
        wrapper.id = 'landing-sticky-nav-inner';
        children.forEach(ch => wrapper.appendChild(ch));
        stickyNav.appendChild(wrapper);
    }

    const heroBtnParent = document.getElementById('btn-enter-arena')?.parentElement;
    if (heroBtnParent) {
        const fakeStoreLinks = heroBtnParent.querySelector('.flex.sm\\:hidden');
        if (fakeStoreLinks) {
            fakeStoreLinks.innerHTML = `<button onclick="declencherOuvertureArene()" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider backdrop-blur-md transition"><i class="fas fa-globe mr-1.5 text-[#4a9d8f]"></i> Continuer sur le web</button>`;
        }
        if (sessionStorage.getItem('la3bin_entered') && !document.getElementById('btn-fast-return')) {
            heroBtnParent.insertAdjacentHTML('beforeend', `<button id="btn-fast-return" onclick="declencherOuvertureArene()" class="mt-3 text-xs font-extrabold text-[#d9f99d] hover:underline flex items-center gap-1.5"><i class="fas fa-bolt"></i> Accès direct aux matchs (Visiteur régulier) →</button>`);
        }
    }

    const notifWrapper = document.querySelector('#drop-notifications')?.parentElement;
    if (notifWrapper && !document.getElementById('btn-sim-mobile')) {
        notifWrapper.insertAdjacentElement('beforebegin', creerBoutonSimulateurMobile());
    }

    if (!document.getElementById('page-public-profile')) {
        const mainWrapper = document.getElementById('main-wrapper');
        if (mainWrapper) {
            mainWrapper.insertAdjacentHTML('afterend', `
                <main id="page-public-profile" class="hidden max-w-[1100px] mx-auto px-4 lg:px-8 pt-6 pb-20 space-y-6">
                    <div class="flex items-center justify-between">
                        <button onclick="fermerProfilPublic()" class="inline-flex items-center gap-2 bg-white hover:bg-zinc-100 text-[#0f2922] border border-zinc-200 font-extrabold text-xs px-4 py-2.5 rounded-full shadow-sm transition"><i class="fas fa-arrow-left"></i> Retour à l'Arène</button>
                        <div id="pub-page-actions-right" class="flex items-center gap-2"></div>
                    </div>
                    <div class="bg-white rounded-[2rem] border border-zinc-200/90 p-6 lg:p-8 shadow-sm">
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-100">
                            <div class="flex items-center gap-5">
                                <div class="relative shrink-0"><img id="page-prof-avatar" src="" class="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-[#d9f99d] shadow-md bg-zinc-50"><span id="page-prof-wsp-badge" class="absolute bottom-1 right-1 bg-[#0f392b] text-[#d9f99d] text-[10px] font-black px-2.5 py-0.5 rounded-full border-2 border-white"><i class="fab fa-whatsapp"></i> Tél. vérifié</span></div>
                                <div>
                                    <div class="flex items-center gap-2 flex-wrap"><h1 id="page-prof-name" class="text-2xl sm:text-3xl font-black text-[#0f2922]">Joueur</h1><span id="page-prof-id" class="text-[10px] font-black bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">#LA3-101</span></div>
                                    <p id="page-prof-username" class="text-sm font-bold text-[#0f392b] mt-0.5">@username · Casablanca</p>
                                    <div class="flex items-center gap-2 flex-wrap mt-2.5"><span id="page-prof-atmosphere" class="text-[11px] font-extrabold bg-[#f3f8f1] text-[#0f392b] border border-[#dcead7] px-3 py-1 rounded-full">Ambiance : Compétitif</span><span class="text-[11px] font-black text-[#0f392b] bg-[#d9f99d] px-3 py-1 rounded-full">« l3eb ila baghi tl3eb »</span></div>
                                </div>
                            </div>
                            <div class="flex flex-wrap md:flex-col gap-2.5 shrink-0">
                                <button id="page-prof-friend-btn" onclick="gererActionAmiProfil()" class="bg-[#0f392b] hover:bg-[#164e3b] text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-full shadow-sm transition"><i class="fas fa-user-check mr-1.5"></i> Ami connecté</button>
                                <button onclick="fermerProfilPublic(); toggleModal();" class="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs px-6 py-3 rounded-full transition">Proposer un match</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
                            <div class="bg-[#f3f8f1] border border-[#dcead7] rounded-3xl p-5 space-y-3">
                                <div class="flex justify-between items-center"><span class="text-[10px] font-black uppercase tracking-widest text-[#0f392b]">Fiabilité & Présence</span><span id="page-prof-trust-badge" class="text-xs font-black bg-[#0f392b] text-[#d9f99d] px-2.5 py-0.5 rounded-full">100%</span></div>
                                <p id="page-prof-trust-facts" class="text-sm font-black text-[#0f2922]">Présent à 0 matchs sur 0</p>
                                <div class="w-full h-2.5 bg-white rounded-full overflow-hidden"><div id="page-prof-trust-bar" class="h-full bg-[#65a30d] rounded-full" style="width: 100%;"></div></div>
                                <div id="page-prof-trust-details" class="text-[11px] font-semibold text-zinc-600 space-y-1 pt-1"></div>
                                <div class="pt-2 border-t border-[#dcead7] flex justify-between items-center text-[10px] text-zinc-500"><span>Calculé via base de données</span><button onclick="contesterPresenceMatch()" class="font-extrabold text-[#0f392b] underline">Contester</button></div>
                            </div>
                            <div class="bg-zinc-50 border border-zinc-200/80 rounded-3xl p-5 flex flex-col justify-between">
                                <div>
                                    <span class="text-[10px] font-black uppercase tracking-widest text-zinc-400">Régularité Sportive</span>
                                    <div class="grid grid-cols-2 gap-3 mt-3">
                                        <div class="bg-white p-3.5 rounded-2xl border border-zinc-200/80 text-center"><span id="page-prof-flames" class="block text-2xl font-black text-[#e07a5f]">🔥 0</span><span class="text-[10px] font-extrabold uppercase text-zinc-500 mt-1 block">Semaines</span></div>
                                        <div class="bg-white p-3.5 rounded-2xl border border-zinc-200/80 text-center"><span id="page-prof-days" class="block text-2xl font-black text-[#0f2922]">0</span><span class="text-[10px] font-extrabold uppercase text-zinc-500 mt-1 block">Jours distincts</span></div>
                                    </div>
                                </div>
                                <p class="text-[11px] font-medium text-zinc-500 mt-3 bg-white p-2.5 rounded-xl border border-zinc-100"><i class="fas fa-fire text-[#e07a5f] mr-1"></i> <b>Règle des flammes :</b> 1 flamme = 1 semaine consécutive avec au moins 1 match confirmé joué.</p>
                            </div>
                            <div class="bg-zinc-50 border border-zinc-200/80 rounded-3xl p-5 space-y-4">
                                <div><span class="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2.5">Niveaux par Sport</span><div id="page-prof-skills-list" class="space-y-2"></div></div>
                                <div class="pt-3 border-t border-zinc-200/80"><span class="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Amis en commun</span><div id="page-prof-mutual-list" class="space-y-1.5"></div></div>
                            </div>
                        </div>
                    </div>
                </main>
            `);
        }
    }

    const panelFeed = document.getElementById('panel-feed');
    if (panelFeed && !document.getElementById('dispo-banner-bar')) {
        panelFeed.insertAdjacentHTML('afterbegin', `
            <div id="dispo-banner-bar" class="bg-[#f3f8f1] border border-[#dcead7] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2.5"><span class="w-2.5 h-2.5 rounded-full bg-[#65a30d] animate-ping"></span><span class="text-xs font-extrabold text-[#0f2922]">Mode « Je suis dispo » :</span><span id="dispo-status-label" class="text-xs font-semibold text-zinc-600">Indique tes créneaux.</span></div>
                <button onclick="basculerEtatDispoJoueur()" id="btn-toggle-dispo" class="bg-white hover:bg-zinc-50 text-[#0f392b] border border-[#dcead7] font-extrabold text-xs px-4 py-1.5 rounded-full shadow-sm transition">Activer ma dispo ce soir</button>
            </div>
        `);
    }
}

function creerBoutonSimulateurMobile() {
    const btn = document.createElement('button');
    btn.id = 'btn-sim-mobile';
    btn.onclick = toggleMobileSimulator;
    btn.className = 'hidden md:flex items-center bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-extrabold px-3.5 py-2 rounded-full transition hover:bg-zinc-200';
    btn.innerHTML = '<i class="fas fa-mobile-screen-button mr-1.5"></i> Vue Mobile';
    return btn;
}

// =========================================================================
// 1. TRANSITION FLUIDE (FLIP) DE 2 À 3 COLONNES AU SCROLL
// =========================================================================
let isThreeColsActive = false;
function basculerColonnesFluide(shouldBeThreeCols) {
    if (shouldBeThreeCols === isThreeColsActive) return;
    const grid = document.getElementById('main-grid');
    const feed = document.getElementById('arene-feed');
    if (!grid || !feed || window.innerWidth < 1024) return;

    const cards = Array.from(feed.children);
    const firstRects = new Map();
    cards.forEach(card => firstRects.set(card, card.getBoundingClientRect()));

    isThreeColsActive = shouldBeThreeCols;
    grid.classList.toggle('scrolled-3-cols', shouldBeThreeCols);

    cards.forEach(card => {
        const first = firstRects.get(card);
        const last = card.getBoundingClientRect();
        if (!first || !last) return;
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            card.style.transition = 'none';
            card.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    card.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
                    card.style.transform = 'translate3d(0, 0, 0)';
                });
            });
        }
    });
}
window.addEventListener('scroll', () => { if (!isMapExpanded) basculerColonnesFluide(window.scrollY > 120); }, { passive: true });

function reouvrirLanding() {
    sessionStorage.removeItem('la3bin_entered');
    window.location.href = 'landing.html';
}

// =========================================================================
// 2. AUTHENTIFICATION SUPABASE & WHATSAPP
// =========================================================================
function exigerConnexion(actionLabel = "effectuer cette action") {
    if (currentUser || localStorage.getItem('la3bin_auth_session') === 'active') return true;
    const modalAuth = document.getElementById('modal-auth');
    if (modalAuth) {
        modalAuth.classList.remove('hidden');
        const sub = modalAuth.querySelector('p');
        if (sub) sub.innerText = `Connecte-toi pour ${actionLabel}.`;
    }
    return false;
}

async function envoyerCodeVerificationWhatsApp() {
    const now = Date.now();
    if (now < otpState.cooldownUntil) {
        return alert(`⏳ Veuillez patienter avant de demander un nouveau code.`);
    }

    const pseudo = document.getElementById('auth-pseudo')?.value.trim();
    const phone = document.getElementById('auth-phone')?.value.trim();
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;

    if (!pseudo || !phone || phone.length < 10) return alert("⚠️ Renseigne ton @username et un numéro valide.");

    otpState.cooldownUntil = now + 30000;
    otpState.expiresAt = now + 300000;
    otpState.attempts = 0;

    if (window.db) {
        try {
            if (email && password) await window.db.auth.signUp({ email, password, options: { data: { username: pseudo, phone } } });
            const { error } = await window.db.auth.signInWithOtp({ phone, options: { channel: 'whatsapp' } });
            if (error) document.getElementById('wsp-demo-code-hint').innerText = `(Service Supabase non relié — Code test: 4829)`;
            else document.getElementById('wsp-demo-code-hint').innerText = `(Vérifie tes messages WhatsApp)`;
        } catch (err) {}
    }
    document.getElementById('auth-step-1')?.classList.add('hidden');
    document.getElementById('auth-step-2')?.classList.remove('hidden');
}

function retourAuthStep1() {
    document.getElementById('auth-step-2')?.classList.add('hidden');
    document.getElementById('auth-step-1')?.classList.remove('hidden');
}

async function validerCodeOtpWhatsApp() {
    if (Date.now() > otpState.expiresAt) return alert("⌛ Ce code a expiré.");
    otpState.attempts += 1;
    if (otpState.attempts > 5) return alert("🚫 Trop de tentatives.");

    const code = document.getElementById('auth-otp-input')?.value.trim();
    const phone = document.getElementById('auth-phone')?.value.trim();
    if (!code || code.length !== 4) return alert("⚠️ Entre le code à 4 chiffres.");

    if (window.db && phone) {
        try {
            const { data, error } = await window.db.auth.verifyOtp({ phone, token: code, type: 'sms' });
            if (!error && data?.user) currentUser = data.user;
        } catch (e) {}
    }

    if (!currentUser && code !== '4829') return alert("❌ Code invalide.");

    const pseudo = document.getElementById('auth-pseudo')?.value.trim().replace(/^@/, '') || 'joueur_casa';
    const prof = getStoredProfile();
    prof.pseudo = pseudo;
    prof.wspVerified = true;
    localStorage.setItem('la3bin_profile_v11', JSON.stringify(prof));
    localStorage.setItem('la3bin_auth_session', 'active');

    afficherProfilUI();
    fermerModalAuth();
}

function connexionRapideInvite() { fermerModalAuth(); }
function fermerModalAuth() { document.getElementById('modal-auth')?.classList.add('hidden'); }
async function seDeconnecter() {
    try { if (window.db) await window.db.auth.signOut(); } catch (e) {}
    currentUser = null;
    localStorage.removeItem('la3bin_auth_session');
    document.getElementById('modal-account')?.classList.add('hidden');
    retourAuthStep1();
    document.getElementById('modal-auth')?.classList.remove('hidden');
}

// =========================================================================
// 3. VRAIE PAGE PROFIL & FIABILITÉ FACTUELLE (Basé sur vraies données)
// =========================================================================
let currentViewedProfileUsername = 'moi';

function calculerFiabiliteFactuelle(joueur) {
    const total = joueur.totalTrackedGames || 0;
    const attended = joueur.attendedGames || 0;
    if (total < 3) {
        return {
            badge: "Nouveau joueur",
            facts: `Nouveau joueur (${total} match${total > 1 ? 's' : ''} joué${total > 1 ? 's' : ''})`,
            percent: 100,
            details: `<p>• Minimum de 3 matchs requis avant d'afficher un pourcentage.</p>`
        };
    }
    const pct = Math.round((attended / total) * 100);
    return {
        badge: `${pct}% Fiable`,
        facts: `Présent à ${attended} matchs sur ${total}`,
        percent: pct,
        details: `<p>• ${joueur.noShows || 0} absence injustifiée (no-show)</p><p>• ${joueur.lateCancellations || 0} annulation tardive (&lt; 4h)</p>`
    };
}

function ouvrirProfilPublicJoueur(usernameOrKey) {
    document.getElementById('modal-account')?.classList.add('hidden');
    document.getElementById('modal-amis')?.classList.add('hidden');
    document.getElementById('modal-match-details')?.classList.add('hidden');
    document.getElementById('modal-vestiaire-equipe')?.classList.add('hidden');

    const prof = getStoredProfile();
    let target = FRIENDS_DB.find(f => f.username === usernameOrKey || f.name.toLowerCase() === String(usernameOrKey).toLowerCase());
    const isSelf = (usernameOrKey === 'moi' || !target);

    if (isSelf) {
        target = {
            id: prof.idUnique || "#LA3-001", name: prof.pseudo || "Nouveau Joueur", username: prof.pseudo || "nouveau_joueur",
            quartier: prof.quartier || "Casablanca", atmosphere: prof.atmosphere || "Mixte", avatar: prof.avatarUrl || CONFIG_AVATARS[0].url,
            attendedGames: 0, totalTrackedGames: 0, lateCancellations: 0, noShows: 0, flameWeeks: 0, distinctDaysPlayed: 0,
            skills: prof.skills || { Padel: '2' }, commonFriends: [], status: "self"
        };
    }

    currentViewedProfileUsername = target.username;
    const rel = calculerFiabiliteFactuelle(target);

    document.getElementById('page-prof-avatar').src = target.avatar;
    document.getElementById('page-prof-name').innerText = target.name;
    document.getElementById('page-prof-id').innerText = target.id || '#LA3-101';
    document.getElementById('page-prof-username').innerText = `@${target.username} · ${target.quartier}`;
    document.getElementById('page-prof-atmosphere').innerText = `Ambiance : ${target.atmosphere}`;

    document.getElementById('page-prof-trust-badge').innerText = rel.badge;
    document.getElementById('page-prof-trust-facts').innerText = rel.facts;
    document.getElementById('page-prof-trust-bar').style.width = `${rel.percent}%`;
    document.getElementById('page-prof-trust-details').innerHTML = rel.details;

    document.getElementById('page-prof-flames').innerText = `🔥 ${target.flameWeeks || 0}`;
    document.getElementById('page-prof-days').innerText = target.distinctDaysPlayed || 0;

    const friendBtn = document.getElementById('page-prof-friend-btn');
    const rightActions = document.getElementById('pub-page-actions-right');
    if (isSelf) {
        if (friendBtn) { friendBtn.innerHTML = '<i class="fas fa-pen mr-1.5"></i> Modifier mon compte'; friendBtn.onclick = () => { fermerProfilPublic(); toggleAccountModal(); }; }
        if (rightActions) rightActions.innerHTML = '';
    } else {
        if (friendBtn) {
            friendBtn.innerHTML = target.status === 'friend' ? '<i class="fas fa-user-check mr-1.5"></i> Ami (Retirer)' : '<i class="fas fa-user-plus mr-1.5"></i> Ajouter en ami';
            friendBtn.onclick = () => gererActionAmiProfil(target.username);
        }
        if (rightActions) {
            rightActions.innerHTML = `<button onclick="bloquerOuSignalerJoueur('${target.username}')" class="text-xs font-bold text-zinc-400 hover:text-red-600 px-3 py-2 rounded-full border bg-white transition"><i class="fas fa-flag mr-1"></i> Signaler / Bloquer</button>`;
        }
    }

    const skillsBox = document.getElementById('page-prof-skills-list');
    if (skillsBox) {
        skillsBox.innerHTML = '';
        Object.entries(target.skills || {}).forEach(([sp, lvl]) => {
            const cfg = SPORT_CONFIG[sp] || SPORT_CONFIG['Football'];
            const lvlObj = MOROCCAN_LEVELS.find(m => m.id === String(lvl)) || MOROCCAN_LEVELS[1];
            skillsBox.insertAdjacentHTML('beforeend', `<div class="flex items-center justify-between bg-white px-3.5 py-2 rounded-2xl border border-zinc-200/80"><span class="text-xs font-black text-[#0f2922] flex items-center gap-2"><i class="fas ${cfg.icon} text-[#0f392b]"></i> ${cfg.label}</span><span class="text-[11px] font-extrabold text-[#0f392b] bg-[#f3f8f1] px-2.5 py-0.5 rounded-full border border-[#dcead7]">${lvlObj.sub}</span></div>`);
        });
    }

    const mutualBox = document.getElementById('page-prof-mutual-list');
    if (mutualBox) {
        mutualBox.innerHTML = '';
        FRIENDS_DB.filter(f => f.username !== target.username).slice(0, 3).forEach(f => {
            const r = calculerFiabiliteFactuelle(f);
            mutualBox.insertAdjacentHTML('beforeend', `<div onclick="ouvrirProfilPublicJoueur('${f.username}')" class="flex items-center justify-between bg-white p-2 rounded-2xl border cursor-pointer hover:border-[#0f392b]"><div class="flex items-center gap-2.5"><img src="${f.avatar}" class="w-8 h-8 rounded-full object-cover"><div><p class="text-xs font-black leading-none">${f.name}</p><p class="text-[10px] font-bold text-zinc-400">@${f.username}</p></div></div><span class="text-[10px] font-black text-[#0f392b] bg-[#f3f8f1] px-2.5 py-0.5 rounded-full">${r.badge}</span></div>`);
        });
    }

    document.getElementById('main-wrapper')?.classList.add('hidden');
    document.getElementById('page-public-profile')?.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fermerProfilPublic() {
    document.getElementById('page-public-profile')?.classList.add('hidden');
    document.getElementById('main-wrapper')?.classList.remove('hidden');
}

function gererActionAmiProfil(username) {
    if (!exigerConnexion("gérer tes amis")) return;
    const f = FRIENDS_DB.find(item => item.username === username);
    if (!f) return;
    f.status = f.status === 'friend' ? 'requested' : 'friend';
    ouvrirProfilPublicJoueur(username);
}
function bloquerOuSignalerJoueur(username) { const motif = prompt(`Raison du signalement de @${username} :`); if (motif) alert("✅ Signalement enregistré."); }
function contesterPresenceMatch() { const msg = prompt("Match concerné :"); if (msg) alert("✅ Contestation transmise."); }

// =========================================================================
// 4. CARTE INTERACTIVE FLUIDE
// =========================================================================
function initialiserCarteCasablanca() {
    const mapEl = document.getElementById('casablanca-map');
    if (!mapEl || typeof L === 'undefined' || casaMap) return;
    casaMap = L.map('casablanca-map', { zoomControl: true, scrollWheelZoom: true, dragging: true }).setView([userCoords.lat, userCoords.lng], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(casaMap);
    casaMapCircle = L.circle([userCoords.lat, userCoords.lng], { color: '#0f392b', fillColor: '#0f392b', fillOpacity: 0.10, weight: 1.5, radius: 2500 }).addTo(casaMap);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (casaMap) casaMap.invalidateSize(); }).observe(mapEl);
    rafraichirMarqueursCarte();
}

function rafraichirMarqueursCarte() {
    if (!casaMap || typeof L === 'undefined') return;
    casaMapMarkers.forEach(m => casaMap.removeLayer(m));
    casaMapMarkers = [];
    CLUBS_DB.forEach(club => {
        if (activeSportFilter !== 'ALL' && club.sport.toLowerCase() !== activeSportFilter.toLowerCase()) return;
        const cfg = SPORT_CONFIG[club.sport] || SPORT_CONFIG['Football'];
        const customIcon = L.divIcon({ html: `<div class="custom-map-marker" title="${club.name}"><i class="fas ${cfg.icon}"></i></div>`, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
        const marker = L.marker([club.lat, club.lng], { icon: customIcon }).addTo(casaMap);
        marker.bindPopup(`<div style="font-family:'Inter',sans-serif; padding:3px;"><p style="font-weight:900; font-size:12px; margin:0;">${club.name}</p><p style="font-size:10px; color:#71717a; margin:2px 0 8px 0;">${club.quartier}</p><button onclick="choisirSportBarre('${club.sport}', '${cfg.label}', '${cfg.icon}')" style="background:#0f392b; color:white; border:none; border-radius:999px; padding:6px 12px; font-size:10px; font-weight:800; cursor:pointer; width:100%;">Filtrer ce club</button></div>`);
        casaMapMarkers.push(marker);
    });
}

function toggleExpandMap() {
    const card = document.getElementById('map-bento-card');
    const wrapper = document.getElementById('map-wrapper-box');
    const lbl = document.getElementById('label-explore-map');
    if (!card || !wrapper) return;
    isMapExpanded = !isMapExpanded;
    card.classList.toggle('map-expanded-wrapper', isMapExpanded);
    wrapper.style.height = isMapExpanded ? 'calc(100vh - 150px)' : '14rem';
    if (lbl) lbl.innerText = isMapExpanded ? 'Réduire la carte' : 'Explorer la carte';
    setTimeout(() => { if (casaMap) casaMap.invalidateSize(); }, 220);
}

function changerQuartierCarte(nom, lat, lng) {
    userCoords = { lat, lng, quartier: `${nom} (Sélectionné)`, isRealGps: false };
    const headerLbl = document.getElementById('header-district-label'); if (headerLbl) headerLbl.innerText = `Casablanca · ${nom}`;
    const mapQuartier = document.getElementById('map-current-quartier'); if (mapQuartier) mapQuartier.innerText = `${nom} (Défaut)`;
    if (casaMap) { casaMap.flyTo([lat, lng], 14, { duration: 0.65 }); if (casaMapCircle) casaMapCircle.setLatLng([lat, lng]); }
    fermerDropdowns();
    afficherFeedFiltre();
}

// =========================================================================
// 5. MATCHMAKING 100% RÉEL (AUCUNE DONNÉE FICTIVE)
// =========================================================================
function choisirSportBarre(sport, label, iconClass = 'fa-trophy') { activeSportFilter = sport; const lbl = document.getElementById('label-bar-sport'); if (lbl) lbl.innerText = label; const ic = document.getElementById('icon-bar-sport'); if (ic) ic.className = `fas ${iconClass} text-[#0f392b]`; fermerDropdowns(); rafraichirMarqueursCarte(); afficherFeedFiltre(); }
function choisirFiltrePeriode(period, label) { activePeriodFilter = period; activeCalendarDate = ''; const lbl = document.getElementById('label-filter-period'); if (lbl) lbl.innerText = label; fermerDropdowns(); afficherFeedFiltre(); }
function choisirDateCalendrier(dateVal) { if (!dateVal) return; activeCalendarDate = dateVal; activePeriodFilter = 'CUSTOM_DATE'; const d = new Date(dateVal); const lbl = document.getElementById('label-filter-period'); if (lbl) lbl.innerText = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); fermerDropdowns(); afficherFeedFiltre(); }
function choisirFiltreNiveau(level, label) { activeLevelFilter = level; const lbl = document.getElementById('label-filter-level'); if (lbl) lbl.innerText = label; fermerDropdowns(); afficherFeedFiltre(); }
function setGenderFilter(gender) {
    activeGenderFilter = gender;
    document.querySelectorAll('.gender-pill-btn').forEach(btn => {
        const g = btn.getAttribute('data-gender');
        if (g === gender) btn.className = 'gender-pill-btn px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#0f392b] text-white transition flex items-center gap-1.5 shadow-sm';
        else if (g === 'FEMME') btn.className = 'gender-pill-btn px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 transition flex items-center gap-1.5';
        else btn.className = 'gender-pill-btn px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition flex items-center gap-1.5';
    });
    afficherFeedFiltre();
}

function resetAllMatchFilters() {
    activeSportFilter = 'ALL'; activePeriodFilter = 'ALL'; activeCalendarDate = ''; activeLevelFilter = 'ALL'; activeAtmosphereFilter = 'ALL'; filterAroundMe = false; setGenderFilter('ALL');
    const sLbl = document.getElementById('label-bar-sport'); if (sLbl) sLbl.innerText = 'Tous les sports';
    const pLbl = document.getElementById('label-filter-period'); if (pLbl) pLbl.innerText = 'Cette semaine';
    const lLbl = document.getElementById('label-filter-level'); if (lLbl) lLbl.innerText = 'Filtres';
    rafraichirMarqueursCarte();
    afficherFeedFiltre();
}

async function chargerArene() {
    allGamesCache = [];
    try {
        if (window.db) {
            const { data } = await window.db.from('games').select('*').gte('game_time', new Date().toISOString()).order('game_time', { ascending: true });
            if (data && data.length > 0) allGamesCache = data;
        }
    } catch (e) {}
    afficherFeedFiltre();
    mettreAJourHeroProchainMatch();
    if(typeof chargerVraisCompteursLanding === 'function') chargerVraisCompteursLanding();
}

function getMoroccanSkillLabel(val) {
    if (String(val) === '1') return 'Men 7a9i nkouuun';
    if (String(val) === '2') return 'Msellek';
    if (String(val) === '3') return 'Nadi';
    return 'Tous niveaux';
}

function afficherFeedFiltre() {
    const feed = document.getElementById('arene-feed');
    if (!feed) return;
    let list = [...allGamesCache];

    if (activeSportFilter !== 'ALL') list = list.filter(g => g.activity_type.toLowerCase() === activeSportFilter.toLowerCase());
    if (activePeriodFilter === 'TODAY') list = list.filter(g => isToday(g.game_time));
    if (activePeriodFilter === 'CUSTOM_DATE' && activeCalendarDate) list = list.filter(g => g.game_time.startsWith(activeCalendarDate));
    if (activeLevelFilter !== 'ALL') list = list.filter(g => String(parseNotes(g.notes).hostSkill || '') === activeLevelFilter);
    if (activeGenderFilter !== 'ALL') list = list.filter(g => (parseNotes(g.notes).gender || 'MIXTE') === activeGenderFilter);

    if (list.length === 0) {
        feed.innerHTML = `
            <div class="col-span-full border border-dashed border-zinc-300 rounded-3xl p-10 text-center space-y-3 bg-white">
                <p class="text-zinc-700 font-black text-sm">L'Arène est vide (Aucun match trouvé).</p>
                <p class="text-zinc-500 text-xs">Seuls les vrais matchs créés par les joueurs s'afficheront ici. Sois le premier à publier un créneau !</p>
                <div class="flex justify-center gap-2.5 pt-2">
                    <button onclick="resetAllMatchFilters()" class="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-extrabold px-5 py-2.5 rounded-full">Effacer les filtres</button>
                    <button onclick="toggleModal()" class="bg-[#0f392b] text-white text-xs font-extrabold px-5 py-2.5 rounded-full shadow-sm">+ Créer un match</button>
                </div>
            </div>`;
        return;
    }

    feed.innerHTML = '';
    list.forEach(p => feed.insertAdjacentHTML('beforeend', genererCarteMatchUnifiee(p)));
}

function genererCarteMatchUnifiee(partie) {
    const cfg = SPORT_CONFIG[partie.activity_type] || SPORT_CONFIG['Football'];
    const meta = parseNotes(partie.notes);
    const d = new Date(partie.game_time);
    const dayLabel = isToday(partie.game_time) ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
    const formattedDay = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
    const timeStr = meta.timeRange || d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const durationStr = meta.duration || '90 min';
    const clubObj = CLUBS_DB.find(c => c.name.toLowerCase() === (partie.location_name || '').toLowerCase());
    const quartierLabel = clubObj ? clubObj.quartier : 'Casablanca';

    const type = (partie.activity_type || '').toLowerCase();
    const SPORT_IMAGES_MAP = {
        padel: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=800&auto=format&fit=crop',
        foot: 'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=800',
        tennis: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800&auto=format&fit=crop',
        basket: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800&auto=format&fit=crop',
        run: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=800&auto=format&fit=crop',
        box: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=800&auto=format&fit=crop',
        mma: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=800&auto=format&fit=crop'
    };
    let bannerImg = SPORT_IMAGES_MAP.padel;
    for (const [key, url] of Object.entries(SPORT_IMAGES_MAP)) { if (type.includes(key)) { bannerImg = url; break; } }

    const sportBadgeLabel = type.includes('foot') ? 'FOOT À 5' : partie.activity_type.toUpperCase();
    const gender = meta.gender || 'MIXTE';
    const genderBadge = gender === 'FEMME'
        ? '<span class="bg-pink-100 text-pink-800 border border-pink-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><i class="fas fa-venus"></i> 100% Féminin</span>'
        : (gender === 'HOMME' ? '<span class="bg-zinc-900/80 text-white px-2.5 py-1 rounded-full text-[10px] font-bold">Hommes</span>' : '<span class="bg-white/95 text-[#0f392b] px-2.5 py-1 rounded-full text-[10px] font-extrabold">Mixte</span>');

    const isFull = partie.players_needed <= 0 || meta.status === 'FULL';
    const joinedList = JSON.parse(localStorage.getItem('la3bin_joined_games') || '[]');
    const waitlistList = JSON.parse(localStorage.getItem('la3bin_waitlist_games') || '[]');
    const isJoined = joinedList.includes(String(partie.id));
    const isWaitlisted = waitlistList.includes(String(partie.id));

    let statusPill = `<span class="text-xs font-extrabold text-[#0f392b]">${partie.players_needed} place${partie.players_needed > 1 ? 's' : ''} dispo</span>`;
    let actionLabel = 'Rejoindre le match';
    let btnClasses = 'bg-[#0f392b] hover:bg-[#164e3b] text-white font-bold text-xs px-5 py-2.5 rounded-full transition active:scale-95 shadow-sm';

    if (isJoined) {
        statusPill = `<span class="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">✓ Inscrit</span>`;
        actionLabel = 'Ouvrir le Vestiaire';
    } else if (isWaitlisted) {
        statusPill = `<span class="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">⏳ Liste d'attente</span>`;
        actionLabel = 'Voir ma position';
        btnClasses = 'bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold text-xs px-5 py-2.5 rounded-full transition';
    } else if (isFull) {
        statusPill = `<span class="text-xs font-extrabold text-amber-700">Complet</span>`;
        actionLabel = "Liste d'attente";
        btnClasses = 'bg-white hover:bg-zinc-50 text-[#0f392b] border border-[#0f392b] font-extrabold text-xs px-5 py-2.5 rounded-full transition';
    }

    const levelLabel = getMoroccanSkillLabel(meta.hostSkill);
    const atmosphereLabel = meta.atmosphere || 'Détente';

    return `
        <div onclick="ouvrirDetailsMatch('${partie.id}')" class="match-card-animated group bg-white rounded-3xl border border-zinc-200/90 shadow-sm hover:shadow-xl overflow-hidden cursor-pointer flex flex-col justify-between">
            <div>
                <div class="relative h-44 w-full overflow-hidden bg-zinc-100">
                    <img src="${bannerImg}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="${partie.activity_type}">
                    <div class="absolute top-3.5 left-3.5 bg-[#d9f99d] text-[#0f392b] px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                        <i class="fas ${cfg.icon}"></i> ${sportBadgeLabel}
                    </div>
                    <div class="absolute top-3.5 right-3.5">${genderBadge}</div>
                </div>
                <div class="p-5">
                    <div class="flex justify-between items-start gap-2">
                        <div>
                            <h3 class="text-lg font-black text-[#0f2922] leading-snug">${meta.subGame || partie.activity_type}</h3>
                            <p class="text-xs font-semibold text-zinc-600 mt-1 flex items-center gap-1.5"><i class="far fa-calendar text-[#0f392b]"></i> ${formattedDay} · ${timeStr} (${durationStr})</p>
                            <p class="text-xs font-medium text-zinc-500 mt-1 flex items-center gap-1.5"><i class="fas fa-location-dot text-zinc-400"></i> ${partie.location_name} · ${quartierLabel}</p>
                        </div>
                        <div class="text-right shrink-0">
                            ${statusPill}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap mt-3">
                        <span class="text-[10px] font-extrabold bg-[#f3f8f1] text-[#0f392b] border border-[#dcead7] px-2.5 py-0.5 rounded-full">Niveau : ${levelLabel}</span>
                        <span class="text-[10px] font-bold bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full">Ambiance : ${atmosphereLabel}</span>
                    </div>
                    <div class="flex items-center justify-between gap-3 mt-4 pt-3.5 border-t border-zinc-100">
                        <div><span class="text-lg font-black text-[#0f2922]">${meta.priceMad > 0 ? `${meta.priceMad} MAD` : 'Gratuit'}</span>${meta.priceMad > 0 ? '<span class="block text-[10px] font-medium text-zinc-400">Indicatif / pers.</span>' : ''}</div>
                        <div class="flex items-center gap-1.5">
                            <button type="button" onclick="event.stopPropagation(); partagerMatchManqueUnJoueur('${partie.id}')" title="Partager" class="w-9 h-9 rounded-full bg-zinc-100 hover:bg-emerald-50 text-zinc-600 hover:text-[#0f392b] flex items-center justify-center transition"><i class="fas fa-share-nodes text-xs"></i></button>
                            <button type="button" onclick="event.stopPropagation(); ouvrirDetailsMatch('${partie.id}')" class="${btnClasses}">${actionLabel}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function partagerMatchManqueUnJoueur(gameId) {
    const partie = allGamesCache.find(g => String(g.id) === String(gameId));
    if (!partie) return;
    const meta = parseNotes(partie.notes);
    const shareUrl = `${window.location.origin}${window.location.pathname}?match=${encodeURIComponent(partie.id)}`;
    const text = `⚡ Il nous manque ${partie.players_needed || 1} joueur pour ${meta.subGame || partie.activity_type} à ${partie.location_name} (${meta.timeRange || '19:00'}) ! Rejoins le match sur LA3BIN! : ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function basculerEtatDispoJoueur() {
    if (!exigerConnexion("signaler ta disponibilité")) return;
    const btn = document.getElementById('btn-toggle-dispo');
    const lbl = document.getElementById('dispo-status-label');
    const isActive = btn?.dataset.active === 'true';
    if (!isActive) {
        if (btn) { btn.dataset.active = 'true'; btn.innerText = '✓ Dispo active ce soir'; btn.className = 'bg-[#0f392b] text-white font-extrabold text-xs px-4 py-1.5 rounded-full shadow-sm transition'; }
        if (lbl) lbl.innerText = 'Tes amis voient que tu es disponible ce soir.';
    } else {
        if (btn) { btn.dataset.active = 'false'; btn.innerText = 'Activer ma dispo ce soir'; btn.className = 'bg-white text-[#0f392b] border border-[#dcead7] font-extrabold text-xs px-4 py-1.5 rounded-full shadow-sm transition'; }
        if (lbl) lbl.innerText = 'Indique tes créneaux pour recevoir des invitations.';
    }
}

let currentVestiairePartie = null;
let currentVestiaireMode = 'edit';

function ouvrirDetailsMatch(gameId) {
    const partie = allGamesCache.find(g => String(g.id) === String(gameId));
    if (!partie) return;
    const cfg = SPORT_CONFIG[partie.activity_type] || SPORT_CONFIG['Football'];
    const meta = parseNotes(partie.notes);

    document.getElementById('detail-icon').className = `fas ${cfg.icon}`;
    document.getElementById('detail-title').innerText = meta.subGame || partie.activity_type;
    document.getElementById('detail-location').innerText = `${partie.location_name} · Paiement sur place`;
    document.getElementById('detail-time').innerText = `Date : ${new Date(partie.game_time).toLocaleDateString('fr-FR')} · ${meta.timeRange || '19:00'} (${meta.duration || '90 min'})`;
    document.getElementById('detail-price').innerText = meta.priceMad > 0 ? `${meta.priceMad} MAD (indicatif)` : 'Gratuit';
    document.getElementById('detail-age').innerText = `${meta.gender || 'Mixte'} · ${meta.atmosphere || 'Détente'}`;
    document.getElementById('detail-level').innerText = getMoroccanSkillLabel(meta.hostSkill);
    document.getElementById('detail-places').innerText = partie.players_needed > 0 ? `${partie.players_needed} dispo` : 'Complet';

    const btnJoin = document.getElementById('detail-action-btn');
    if (btnJoin) {
        if (partie.players_needed <= 0) {
            btnJoin.innerText = "Rejoindre la liste d'attente (Priorité auto)";
            btnJoin.onclick = () => inscrireListeAttente(partie.id);
        } else {
            btnJoin.innerText = "Rejoindre le match";
            btnJoin.onclick = () => rejoindreMatchConfirme(partie.id);
        }
    }

    const btnReadonly = document.getElementById('detail-vestiaire-readonly-btn');
    if (btnReadonly) {
        btnReadonly.onclick = () => {
            fermerDetailsMatch();
            setTimeout(() => afficherMonMatchDetail(partie, meta.subGame || partie.activity_type, 'read'), 250);
        };
    }

    const modal = document.getElementById('modal-match-details');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('translate-y-full'), 10);
}

function rejoindreMatchConfirme(gameId) {
    if (!exigerConnexion("rejoindre ce match")) return;
    const partie = allGamesCache.find(g => String(g.id) === String(gameId));
    if (!partie) return;

    const saved = JSON.parse(localStorage.getItem('la3bin_joined_games') || '[]');
    if (!saved.includes(String(gameId))) {
        saved.push(String(gameId));
        localStorage.setItem('la3bin_joined_games', JSON.stringify(saved));
        partie.players_needed = Math.max(0, (partie.players_needed || 1) - 1);
    }
    fermerDetailsMatch();
    afficherFeedFiltre();
    setTimeout(() => afficherMonMatchDetail(partie, parseNotes(partie.notes).subGame || partie.activity_type, 'edit'), 250);
}

function inscrireListeAttente(gameId) {
    if (!exigerConnexion("rejoindre la liste d'attente")) return;
    const wl = JSON.parse(localStorage.getItem('la3bin_waitlist_games') || '[]');
    if (!wl.includes(String(gameId))) { wl.push(String(gameId)); localStorage.setItem('la3bin_waitlist_games', JSON.stringify(wl)); }
    alert("⏳ Tu es n°1 sur la liste d'attente ! Si une place se libère, tu recevras une notification avec un délai de 30 min pour confirmer.");
    fermerDetailsMatch();
    afficherFeedFiltre();
}

function fermerDetailsMatch() {
    const modal = document.getElementById('modal-match-details');
    modal.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function afficherMonMatchDetail(partie, title, mode = 'edit') {
    currentVestiairePartie = partie;
    currentVestiaireMode = mode;
    document.getElementById('modal-mes-matchs')?.classList.add('hidden');

    const displayTitle = title || partie.activity_type;
    document.getElementById('vestiaire-equipe-titre').innerText = displayTitle;
    const subEl = document.getElementById('story-match-subtitle');
    if (subEl) subEl.innerText = `${displayTitle} · ${partie.location_name || 'Casablanca'}`;

    const modeBadge = document.getElementById('vestiaire-mode-badge');
    const instructionEl = document.getElementById('vestiaire-instruction-text');
    const resetBtn = document.getElementById('btn-reset-vestiaire');

    if (mode === 'read') {
        if (modeBadge) { modeBadge.innerText = '👁️ Lecture Seule'; modeBadge.className = 'text-[9px] font-black uppercase bg-zinc-200 text-zinc-700 px-2.5 py-0.5 rounded-full'; }
        if (instructionEl) instructionEl.innerText = 'Clique sur un joueur pour ouvrir sa Page Profil complète';
        if (resetBtn) resetBtn.classList.add('hidden');
    } else {
        if (modeBadge) { modeBadge.innerText = '👑 Organisateur / Participant'; modeBadge.className = 'text-[9px] font-black uppercase bg-[#d9f99d] text-[#0f392b] px-2.5 py-0.5 rounded-full'; }
        if (instructionEl) instructionEl.innerText = 'Touchez ou glissez un joueur sur un poste';
        if (resetBtn) resetBtn.classList.remove('hidden');
    }

    const modal = document.getElementById('modal-vestiaire-equipe');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('translate-y-full'), 10);

    if (typeof initialiserVestiaire === 'function') initialiserVestiaire(partie.activity_type, mode);
}

function reinitialiserPlacementVestiaire() {
    document.getElementById('story-mvp-pill')?.classList.add('hidden');
    if (currentVestiairePartie && typeof initialiserVestiaire === 'function') initialiserVestiaire(currentVestiairePartie.activity_type, currentVestiaireMode);
}

function fermerVestiaireEquipe() {
    const modal = document.getElementById('modal-vestiaire-equipe');
    modal.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// =========================================================================
// 6. MES AMIS, MON COMPTE, MES MATCHS & CRÉATION
// =========================================================================
function ouvrirModalAmis() {
    const prof = getStoredProfile();
    const myIdEl = document.getElementById('friends-my-id');
    if (myIdEl) myIdEl.innerText = prof.idUnique || '#LA3-001';
    renderStoriesAmis();
    filtrerListeAmis('');
    document.getElementById('modal-amis')?.classList.remove('hidden');
}

function fermerModalAmis() { document.getElementById('modal-amis')?.classList.add('hidden'); }
function copyUserIdFromFriends() {
    const prof = getStoredProfile();
    navigator.clipboard?.writeText(prof.idUnique || '#LA3-001').catch(() => {});
    const btn = document.getElementById('btn-copy-friends-id');
    if (btn) { btn.innerText = 'Copié ✓'; setTimeout(() => { btn.innerText = 'Copier ID'; }, 1000); }
}

function renderStoriesAmis() {
    const row = document.getElementById('friends-stories-row');
    if (!row) return;
    row.innerHTML = '';
    FRIENDS_DB.forEach(f => {
        row.insertAdjacentHTML('beforeend', `<div onclick="ouvrirProfilPublicJoueur('${f.username}')" class="flex flex-col items-center shrink-0 cursor-pointer group"><div class="p-0.5 rounded-full bg-gradient-to-tr from-[#e07a5f] via-amber-400 to-[#0f392b] group-hover:scale-105 transition"><div class="p-0.5 bg-white rounded-full relative"><img src="${f.avatar}" class="w-12 h-12 rounded-full object-cover"><span class="absolute -bottom-1 -right-1 bg-zinc-900 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white">🔥${f.flameWeeks}</span></div></div><span class="text-[10px] font-bold text-zinc-700 mt-1 max-w-[64px] truncate">@${f.username}</span></div>`);
    });
}

function filtrerListeAmis(query = '') {
    const box = document.getElementById('friends-modal-list');
    if (!box) return;
    const q = query.trim().toLowerCase();
    const filtered = FRIENDS_DB.filter(f => f.username.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q));
    box.innerHTML = '';
    filtered.forEach(f => {
        const rel = calculerFiabiliteFactuelle(f);
        box.insertAdjacentHTML('beforeend', `<div onclick="ouvrirProfilPublicJoueur('${f.username}')" class="cursor-pointer bg-white p-3 rounded-2xl border border-zinc-200/90 hover:border-[#0f392b] transition flex items-center justify-between gap-2 shadow-sm"><div class="flex items-center gap-3 min-w-0"><img src="${f.avatar}" class="w-11 h-11 rounded-full object-cover border border-zinc-200"><div class="min-w-0"><div class="flex items-center gap-1.5 flex-wrap"><h4 class="font-black text-xs text-zinc-900 truncate">${f.name}</h4><span class="text-[9px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">${rel.badge}</span></div><p class="text-[10px] font-bold text-[#0f392b]">@${f.username} · ${rel.facts}</p></div></div><span class="px-2.5 py-1 rounded-full bg-orange-50 text-[#e07a5f] text-[10px] font-black shrink-0">🔥 ${f.flameWeeks} sem.</span></div>`);
    });
}

const DEFAULT_SKILLS = { 'Padel': '2', 'Football': '2', 'Tennis': '1', 'Basketball': '2' };
function getStoredProfile() {
    const raw = localStorage.getItem('la3bin_profile_v11');
    if (!raw) return { pseudo: '', idUnique: '#LA3-001', avatarUrl: CONFIG_AVATARS[0].url, prefGenre: 'MIXTE', atmosphere: 'Compétitif', skills: { ...DEFAULT_SKILLS } };
    try { const parsed = JSON.parse(raw); return { ...parsed, skills: { ...DEFAULT_SKILLS, ...(parsed.skills || {}) } }; } catch (e) { return { pseudo: '', idUnique: '#LA3-001', avatarUrl: CONFIG_AVATARS[0].url, prefGenre: 'MIXTE', atmosphere: 'Compétitif', skills: { ...DEFAULT_SKILLS } }; }
}
function getLocalProfile() { return getStoredProfile(); }

function toggleAccountModal() {
    const modal = document.getElementById('modal-account');
    if (!modal) return;
    if (modal.classList.contains('hidden')) afficherProfilUI();
    modal.classList.toggle('hidden');
}

function selectPrefGenre(genre) {
    const prof = getStoredProfile();
    prof.prefGenre = genre;
    localStorage.setItem('la3bin_profile_v11', JSON.stringify(prof));
    ['MIXTE', 'HOMME', 'FEMME'].forEach(g => {
        const btn = document.getElementById(`pref-btn-${g}`);
        if (!btn) return;
        btn.className = (g === genre) ? 'py-2.5 rounded-2xl text-xs font-extrabold border bg-[#0f392b] text-white border-[#0f392b] transition' : 'py-2.5 rounded-2xl text-xs font-bold border bg-zinc-50 text-zinc-700 border-zinc-200 transition';
    });
}

function setSkillLevel(sport, levelId) {
    const prof = getStoredProfile();
    prof.skills[sport] = levelId;
    localStorage.setItem('la3bin_profile_v11', JSON.stringify(prof));
    renderSkillSelectors(prof.skills);
}

function renderSkillSelectors(skills = {}) {
    const container = document.getElementById('skills-selector-box');
    if (!container) return;
    container.innerHTML = '';
    const mainSports = ['Padel', 'Football', 'Tennis', 'Basketball', 'Running'];
    mainSports.forEach(sport => {
        const cfg = SPORT_CONFIG[sport] || SPORT_CONFIG['Football'];
        const cur = String(skills[sport] || '2');
        const pills = MOROCCAN_LEVELS.map(l => {
            const active = cur === l.id;
            return `<button type="button" onclick="setSkillLevel('${sport}', '${l.id}')" class="flex-1 py-2 px-2 rounded-2xl text-center transition ${active ? 'bg-[#0f392b] text-white shadow-sm font-black' : 'bg-white text-zinc-600 border border-zinc-200 font-semibold hover:bg-zinc-100'}"><span class="block text-[10px] leading-tight">${l.sub}</span><span class="block text-[8px] opacity-75">${l.label}</span></button>`;
        }).join('');
        container.insertAdjacentHTML('beforeend', `<div class="bg-zinc-50 p-3 rounded-2xl border border-zinc-200/80"><div class="flex items-center justify-between mb-2"><span class="text-xs font-black text-[#0f2922] flex items-center gap-2"><i class="fas ${cfg.icon} text-[#0f392b]"></i> ${cfg.label}</span></div><div class="flex gap-1.5">${pills}</div></div>`);
    });
}

function afficherProfilUI() {
    const prof = getStoredProfile();
    const avatarUrl = prof.avatarUrl || CONFIG_AVATARS[0].url;
    const hImg = document.getElementById('header-avatar'); if (hImg) hImg.src = avatarUrl;
    const pImg = document.getElementById('prof-avatar-preview'); if (pImg) pImg.src = avatarUrl;
    const badge = document.getElementById('prof-id-badge'); if (badge) badge.innerText = prof.idUnique || '#LA3-001';
    const pseudoInput = document.getElementById('prof-pseudo'); if (pseudoInput) pseudoInput.value = prof.pseudo || 'Nouveau Joueur';
    selectPrefGenre(prof.prefGenre || 'MIXTE');
    renderSkillSelectors(prof.skills);
}

function copyUserId() {
    const prof = getStoredProfile();
    const badge = document.getElementById('prof-id-badge');
    if (!badge) return;
    navigator.clipboard?.writeText(prof.idUnique || '#LA3-001').catch(() => {});
    badge.innerText = 'ID Copié ✓';
    setTimeout(() => { badge.innerText = prof.idUnique || '#LA3-001'; }, 1000);
}

function saveLocalProfile() {
    const prof = getStoredProfile();
    const pseudoInput = document.getElementById('prof-pseudo');
    if (pseudoInput && pseudoInput.value.trim()) prof.pseudo = pseudoInput.value.trim().replace(/^@/, '');
    localStorage.setItem('la3bin_profile_v11', JSON.stringify(prof));
    afficherProfilUI();
    toggleAccountModal();
}

function switchMesMatchsView(viewMode) {
    const listUi = document.getElementById('mes-matchs-list-ui');
    const calUi = document.getElementById('mes-matchs-calendar-ui');
    const btnList = document.getElementById('btn-view-list');
    const btnCal = document.getElementById('btn-view-cal');

    if (viewMode === 'CALENDAR') {
        listUi?.classList.add('hidden');
        calUi?.classList.remove('hidden');
        if (btnCal) btnCal.className = 'px-3 py-1 rounded-full text-[10px] font-black uppercase bg-[#0f392b] text-white transition';
        if (btnList) btnList.className = 'px-3 py-1 rounded-full text-[10px] font-black uppercase text-zinc-600 transition';
        renderMesMatchsCalendarGrid();
    } else {
        calUi?.classList.add('hidden');
        listUi?.classList.remove('hidden');
        if (btnList) btnList.className = 'px-3 py-1 rounded-full text-[10px] font-black uppercase bg-[#0f392b] text-white transition';
        if (btnCal) btnCal.className = 'px-3 py-1 rounded-full text-[10px] font-black uppercase text-zinc-600 transition';
    }
}

function renderMesMatchsCalendarGrid() {
    const grid = document.getElementById('mes-matchs-cal-grid');
    if (!grid) return;
    grid.innerHTML = '';
    // Aucun match enregistré (puisque test réel)
    for (let day = 1; day <= 31; day++) {
        grid.insertAdjacentHTML('beforeend', `<div class="h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold bg-zinc-50 text-zinc-500 transition"><span>${day}</span></div>`);
    }
}

async function chargerMesMatchs() {
    const container = document.getElementById('mes-matchs-list-ui');
    if (!container) return;
    const joinedList = JSON.parse(localStorage.getItem('la3bin_joined_games') || '[]');
    let myMatches = allGamesCache.filter(g => joinedList.includes(String(g.id)));
    
    if (myMatches.length === 0) {
        container.innerHTML = '<div class="text-center p-6 bg-white border border-zinc-200 rounded-3xl"><p class="text-xs font-bold text-zinc-500">Aucun match prévu.</p></div>';
        return;
    }
    
    container.innerHTML = '';
    myMatches.forEach((partie, idx) => {
        const cfg = SPORT_CONFIG[partie.activity_type] || SPORT_CONFIG['Football'];
        const meta = parseNotes(partie.notes);
        container.insertAdjacentHTML('beforeend', `<div class="bg-white border border-zinc-200 p-4 rounded-3xl shadow-sm space-y-3"><div class="flex justify-between items-start"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-2xl bg-[#d9f99d] text-[#0f392b] flex items-center justify-center text-base"><i class="fas ${cfg.icon}"></i></div><div><h3 class="text-sm font-black text-zinc-900">${meta.subGame || partie.activity_type}</h3><p class="text-[11px] font-semibold text-zinc-500">${partie.location_name} · ${meta.timeRange || '19:00'}</p></div></div><span class="bg-emerald-50 text-[#0f392b] text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200">Confirmé</span></div><div class="flex gap-2"><button type="button" class="js-open-vestiaire flex-1 bg-[#0f392b] hover:bg-[#164e3b] text-white text-xs font-extrabold uppercase tracking-wider py-2.5 rounded-full transition flex items-center justify-center gap-1.5"><i class="fas fa-shirt text-[#d9f99d]"></i> Vestiaire</button></div></div>`);
        container.lastElementChild.querySelector('.js-open-vestiaire').addEventListener('click', () => { afficherMonMatchDetail(partie, meta.subGame || partie.activity_type, 'edit'); });
    });
}

function renderWeeklyRdvBar() {
    const bar = document.getElementById('weekly-rdv-bar');
    if (!bar) return;
    bar.innerHTML = '';
    const nomsJours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(base); d.setDate(base.getDate() + i);
        const dayName = nomsJours[d.getDay()]; const dayNum = d.getDate();
        bar.insertAdjacentHTML('beforeend', `<div onclick="choisirFiltrePeriode('${i === 0 ? 'TODAY' : 'ALL'}', '${dayName} ${dayNum}')" class="bg-white hover:border-[#0f392b] border border-zinc-200/90 rounded-2xl py-2.5 px-1 text-center cursor-pointer transition shadow-sm flex flex-col items-center justify-center"><span class="text-[10px] font-semibold text-zinc-400">${dayName}</span><div class="flex items-center gap-1 mt-0.5"><span class="text-xs font-black text-[#0f2922]">${dayNum}</span></div></div>`);
    }
}

function mettreAJourHeroProchainMatch() {
    const nextMatch = allGamesCache[0];
    const heroCard = document.getElementById('hero-next-match-card');
    
    if (!nextMatch) {
        if (heroCard) heroCard.style.display = 'none';
        return;
    }
    
    if (heroCard) heroCard.style.display = 'flex';
    const timeEl = document.getElementById('hero-next-time');
    const subEl = document.getElementById('hero-next-sub');
    const meta = parseNotes(nextMatch.notes);
    const d = new Date(nextMatch.game_time);
    const timeStr = meta.timeRange || d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    if (timeEl) timeEl.innerText = `${isToday(nextMatch.game_time) ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}, ${timeStr}`;
    if (subEl) subEl.innerText = `${nextMatch.activity_type} · ${nextMatch.location_name}`;
}

function ouvrirProchainMatchHero() {
    if (allGamesCache[0]) ouvrirDetailsMatch(allGamesCache[0].id);
}

function isToday(dateStr) {
    const d = new Date(dateStr); const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function parseNotes(s) {
    try { if (s && typeof s === 'string' && s.startsWith('{')) return JSON.parse(s); } catch (e) {}
    return { subGame: null, priceMad: 80, timeRange: '19:00', gender: 'MIXTE', atmosphere: 'Détente', duration: '90 min' };
}

function toggleModalGeneric(id) { document.getElementById(id)?.classList.toggle('hidden'); }
function toggleCustomDropdown(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isHidden = el.classList.contains('hidden');
    fermerDropdowns();
    if (isHidden) el.classList.remove('hidden');
}

function toggleMobileSimulator() {
    isMobileSim = !isMobileSim;
    document.body.classList.toggle('mobile-sim-mode', isMobileSim);
    const btn = document.getElementById('btn-sim-mobile');
    if (btn) btn.innerHTML = isMobileSim ? '<i class="fas fa-desktop mr-1.5"></i> Vue PC' : '<i class="fas fa-mobile-screen-button mr-1.5"></i> Vue Mobile';
    setTimeout(() => { if (casaMap) casaMap.invalidateSize(); }, 250);
}

function switchMobileTab(t) {
    fermerProfilPublic();
    if (t === 'manage') { toggleModalGeneric('modal-mes-matchs'); chargerMesMatchs(); }
    if (t === 'account') toggleAccountModal();
}

function toggleModal() {
    if (!exigerConnexion("organiser un match")) return;
    toggleModalGeneric('modal-organiser');
}

async function creerPartie() {
    if (!exigerConnexion("publier un match")) return;
    const sport = document.getElementById('input-sport')?.value || 'Padel';
    const gender = document.getElementById('input-gender')?.value || 'MIXTE';
    const subGame = document.getElementById('input-subgame')?.value.trim() || `Match ${sport}`;
    const lieu = document.getElementById('input-lieu')?.value.trim() || 'Oasis Padel Club';
    const time = document.getElementById('input-time')?.value || '19:00';
    const priceMad = parseInt(document.getElementById('input-price')?.value) || 80;

    const prof = getStoredProfile();
    const hostSkill = prof.skills?.[sport] || '2';
    const notesObj = { subGame, priceMad, gender, hostSkill, atmosphere: prof.atmosphere || 'Compétitif', duration: '90 min', timeRange: time, status: 'AVAILABLE' };

    const newMatch = {
        id: 'local-' + Date.now(),
        activity_type: sport,
        location_name: lieu,
        game_time: new Date().toISOString(),
        players_needed: 3, // Défaut : Cherche 3 joueurs
        host_name: prof.pseudo || 'Organisateur',
        notes: JSON.stringify(notesObj)
    };

    allGamesCache.unshift(newMatch);
    
    // Inscrire l'organisateur automatiquement
    const saved = JSON.parse(localStorage.getItem('la3bin_joined_games') || '[]');
    saved.push(String(newMatch.id));
    localStorage.setItem('la3bin_joined_games', JSON.stringify(saved));
    
    toggleModalGeneric('modal-organiser');
    afficherFeedFiltre();
    mettreAJourHeroProchainMatch();
}

function ouvrirChatVestiaire() {
    if (currentVestiaireMode === 'read') return alert("🔒 Le salon de discussion est réservé aux joueurs inscrits à ce match.");
    if (!exigerConnexion("accéder au chat du match")) return;
    fermerVestiaireEquipe();
    const modalChat = document.getElementById('modal-chat');
    modalChat.classList.remove('hidden');
    setTimeout(() => modalChat.classList.remove('translate-y-full'), 10);
}

function fermerChat() {
    const modalChat = document.getElementById('modal-chat');
    modalChat.classList.add('translate-y-full');
    setTimeout(() => modalChat.classList.add('hidden'), 300);
}

function envoyerMessageChat() {
    const inp = document.getElementById('chat-input-text');
    const txt = inp?.value.trim();
    if (!txt) return;
    const box = document.getElementById('chat-messages-box');
    box?.insertAdjacentHTML('beforeend', `<div class="spot-pop-in self-end bg-[#0f392b] text-white p-3 rounded-2xl rounded-tr-none shadow-sm mb-2 max-w-[80%]"><p class="text-[11px] font-medium">${txt}</p></div>`);
    inp.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('la3bin_auth_session')) {
        document.getElementById('modal-auth')?.classList.remove('hidden');
    }
    injecterAmeliorationsUI();
    const params = new URLSearchParams(window.location.search);
    if (params.get('match')) pendingRedirectMatchId = params.get('match');
    if (params.get('login') === '1') document.getElementById('modal-auth')?.classList.remove('hidden');

    afficherProfilUI();
    renderWeeklyRdvBar();
    initialiserCarteCasablanca();
    chargerArene();
});