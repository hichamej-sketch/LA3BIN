// =========================================================================
// LA3BIN! — VESTIAIRE TACTIQUE, EXPORTS PNG TRANSPARENTS & EFFETS (js/effects.js)
// =========================================================================
const cursor = document.getElementById('cuberto-cursor');
if (cursor) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    });
}

// Inertie du scroll (désactivée automatiquement si l'utilisateur préfère réduire les animations)
try {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof Lenis !== 'undefined') {
        const lenis = new Lenis({ duration: 1.05, smooth: true });
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }
} catch (e) {}

// =========================================================================
// MOTEUR DU VESTIAIRE :
// - Poteaux de buts aux 2 extrémités (Attaque en haut, Défense en bas)
// - Tap-to-Select / Tap-to-Place sur mobile + Pinch & Drag sur PC
// - Retour aux gradins (✕) + Mode Lecture Seule avec profils cliquables
// - Exports PNG transparents séparés (Formation vs Score seul) avec aperçu
// =========================================================================
const VESTIAIRE_ROSTER = [
    { id: 'v_p1', username: 'moi', name: 'Moi', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=f4f4f5' },
    { id: 'v_p2', username: 'yassine_casa', name: 'Yassine', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150' },
    { id: 'v_p3', username: 'salma_padel', name: 'Salma', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150' },
    { id: 'v_p4', username: 'mehdi_run', name: 'Mehdi', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150' },
    { id: 'v_p5', username: 'karim_nadi', name: 'Karim', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150' }
];

let activePinchCard = null;
let activePinchGhost = null;
let selectedTapCard = null;
let isDraggingMvpCrown = false;
let vestiaireListenersBound = false;
let activeVestiaireMode = 'edit';

function initialiserVestiaire(sportType, mode = 'edit') {
    activeVestiaireMode = mode;
    selectedTapCard = null;
    const root = document.getElementById('modal-vestiaire-equipe');
    if (!root) return;

    const field = root.querySelector('#tactical-field-edit');
    const spotsContainer = root.querySelector('#formation-spots-edit');
    const benchPlayersBox = root.querySelector('#bench-players-edit');
    const crownEl = document.getElementById('draggable-mvp-crown');
    if (!field || !spotsContainer || !benchPlayersBox) return;

    const prof = typeof getLocalProfile === 'function' ? getLocalProfile() : null;
    if (prof && prof.avatarUrl) VESTIAIRE_ROSTER[0].avatar = prof.avatarUrl;
    if (prof && prof.pseudo) VESTIAIRE_ROSTER[0].name = prof.pseudo;

    if (crownEl) crownEl.style.display = (mode === 'read') ? 'none' : 'flex';

    // Injecter le bouton d'export "Sticker Score Seul" à côté du bouton "Sticker Formation" s'il n'existe pas encore
    const exportBtn = document.getElementById('btn-export-insta');
    if (exportBtn && !document.getElementById('btn-export-score-only')) {
        exportBtn.insertAdjacentHTML('afterend', `
            <button onclick="exporterScoreSeulInstagram()" id="btn-export-score-only" class="bg-zinc-900 hover:bg-black text-[#d9f99d] font-extrabold text-[10px] uppercase tracking-wider py-3 px-3.5 rounded-full active:scale-95 shadow-md flex items-center justify-center gap-1.5 transition" title="Exporter le sticker du score seul sans fond">
                <i class="fas fa-trophy"></i> Score PNG
            </button>
        `);
    }

    // Ajouter le poteau d'attaque en haut du terrain s'il n'existe pas encore (pour avoir les buts aux 2 extrémités)
    if (!field.querySelector('.goalpost-top')) {
        field.insertAdjacentHTML('afterbegin', `
            <div class="goalpost-top flex items-start justify-center pt-0.5">
                <span class="text-[7px] font-black uppercase tracking-widest text-white/90 bg-black/45 px-1.5 rounded">⚡ ATTAQUE / BUT ADVERSE</span>
            </div>
        `);
    }

    // 1. Générer les participants dans les Gradins
    benchPlayersBox.innerHTML = '';
    VESTIAIRE_ROSTER.forEach((p) => {
        benchPlayersBox.insertAdjacentHTML('beforeend', `
            <div class="bench-player-card relative flex flex-col items-center shrink-0 cursor-pointer select-none group"
                 style="touch-action: none;"
                 data-player-id="${p.id}"
                 data-player-username="${p.username}"
                 data-player-name="${p.name}"
                 data-player-avatar="${p.avatar}">
                ${mode === 'edit' ? '<span class="place-moi-badge">PLACE MOI</span>' : ''}
                <div class="bench-avatar-ring w-11 h-11 rounded-full p-0.5 border-2 border-[#0f392b] bg-white shadow-sm transition-transform group-hover:scale-105 pointer-events-none">
                    <img src="${p.avatar}" crossorigin="anonymous" alt="${p.name}" class="w-full h-full rounded-full object-cover pointer-events-none">
                </div>
                <span class="text-[10px] font-black text-zinc-800 mt-1 pointer-events-none">${p.name}</span>
            </div>
        `);
    });

    // 2. Adapter le terrain et les postes selon le sport
    const type = (sportType || 'Padel').toLowerCase();
    const goalpostBottom = root.querySelector('.goalpost-bottom');
    const goalpostTop = root.querySelector('.goalpost-top');

    field.className = 'vestiaire-pitch-surface relative w-full h-[330px] overflow-hidden flex flex-col justify-between p-3.5';

    let customLines = root.querySelector('#sport-custom-markings');
    if (!customLines) {
        customLines = document.createElement('div');
        customLines.id = 'sport-custom-markings';
        customLines.className = 'absolute inset-0 pointer-events-none z-0';
        field.insertBefore(customLines, spotsContainer);
    }
    root.querySelectorAll('.pitch-line-el').forEach(el => el.classList.add('hidden'));

    let spots = [];
    if (type.includes('box')) {
        field.classList.add('pitch-theme-boxing');
        if (goalpostTop) goalpostTop.innerHTML = '<span class="text-[7px] font-black uppercase text-white bg-blue-600 px-2 rounded">🥊 COIN BLEU</span>';
        if (goalpostBottom) goalpostBottom.innerHTML = '<span class="text-[7px] font-black uppercase text-white bg-red-600 px-2 rounded">🥊 COIN ROUGE</span>';
        customLines.innerHTML = `<div class="pitch-line-el absolute inset-6 border-4 border-white/80 rounded-lg"></div>`;
        spots = [
            { idx: 0, role: 'Coin Bleu', top: '28%', left: '30%' },
            { idx: 1, role: 'Coin Rouge', top: '70%', left: '70%' },
            { idx: 2, role: 'Sparring 1', top: '28%', left: '72%' },
            { idx: 3, role: 'Sparring 2', top: '70%', left: '28%' }
        ];
    } else if (type.includes('padel') || type.includes('tennis')) {
        field.classList.add(type.includes('tennis') ? 'pitch-theme-tennis' : 'pitch-theme-padel');
        if (goalpostTop) goalpostTop.innerHTML = '<span class="text-[7px] font-black uppercase text-white/90 bg-black/50 px-1.5 rounded">⚡ FILET / VOLÉE</span>';
        if (goalpostBottom) goalpostBottom.innerHTML = '<span class="text-[7px] font-black uppercase text-white/90 bg-black/50 px-1.5 rounded">🛡️ VITRE DE FOND / DÉFENSE</span>';
        customLines.innerHTML = `
            <div class="pitch-line-el absolute inset-4 border-2 border-white/75 rounded-lg"></div>
            <div class="pitch-line-el absolute top-1/2 left-3 right-3 h-1 bg-white/90 -translate-y-1/2"></div>
            <div class="pitch-line-el absolute top-[24%] bottom-[24%] left-1/2 w-[2px] bg-white/55 -translate-x-1/2"></div>
        `;
        spots = [
            { idx: 0, role: 'Volée G.', top: '28%', left: '28%' },
            { idx: 1, role: 'Volée D.', top: '28%', left: '72%' },
            { idx: 2, role: 'Défense G.', top: '72%', left: '28%' },
            { idx: 3, role: 'Défense D.', top: '72%', left: '72%' }
        ];
    } else {
        field.classList.add('pitch-theme-foot');
        root.querySelectorAll('.pitch-line-el').forEach(el => el.classList.remove('hidden'));
        customLines.innerHTML = '';
        if (goalpostTop) goalpostTop.innerHTML = '<span class="text-[7px] font-black uppercase text-white/90 bg-black/50 px-1.5 rounded">⚡ ATTAQUE / BUT ADVERSE</span>';
        if (goalpostBottom) goalpostBottom.innerHTML = '<span class="text-[7px] font-black uppercase text-white/90 bg-black/50 px-1.5 rounded">🥅 DÉFENSE / GARDIEN</span>';
        spots = [
            { idx: 0, role: 'Buteur', top: '22%', left: '50%' },
            { idx: 1, role: 'Ailier G.', top: '44%', left: '22%' },
            { idx: 2, role: 'Ailier D.', top: '44%', left: '78%' },
            { idx: 3, role: 'Défenseur', top: '64%', left: '30%' },
            { idx: 4, role: 'Gardien', top: '78%', left: '70%' }
        ];
    }

    spotsContainer.innerHTML = '';
    spots.forEach((pos) => {
        spotsContainer.insertAdjacentHTML('beforeend', `
            <div class="drop-zone w-14 h-14 rounded-full border-2 border-dashed border-white/80 bg-black/30 flex flex-col items-center justify-center z-10 cursor-pointer"
                 style="top: ${pos.top}; left: ${pos.left};"
                 data-spot-idx="${pos.idx}"
                 data-role="${pos.role}">
                <i class="fas fa-plus text-white/80 text-xs pointer-events-none"></i>
                <span class="text-[8px] font-extrabold uppercase text-white/95 tracking-wider mt-0.5 pointer-events-none">${pos.role}</span>
            </div>
        `);
    });

    if (mode === 'read') {
        const zones = spotsContainer.querySelectorAll('.drop-zone');
        const cards = benchPlayersBox.querySelectorAll('.bench-player-card');
        zones.forEach((z, idx) => {
            if (cards[idx]) placerJoueurSurSpot(cards[idx], z);
        });
        cards.forEach(card => {
            card.onclick = () => ouvrirProfilPublicJoueur(card.getAttribute('data-player-username'));
        });
        return;
    }

    activerPinchAndDropVestiaire(root);
}

function placerJoueurSurSpot(playerCard, zone) {
    if (!playerCard || !zone) return;

    if (zone.classList.contains('placed-spot')) {
        retirerJoueurDuTerrain(zone.getAttribute('data-spot-idx'));
    }

    const playerId = playerCard.getAttribute('data-player-id');
    const username = playerCard.getAttribute('data-player-username') || 'yassine_casa';
    const name = playerCard.getAttribute('data-player-name');
    const avatar = playerCard.getAttribute('data-player-avatar');
    const spotIdx = zone.getAttribute('data-spot-idx');

    playerCard.querySelector('.place-moi-badge')?.remove();
    playerCard.querySelector('.bench-avatar-ring')?.classList.remove('ring-4', 'ring-[#d9f99d]');
    playerCard.classList.add('opacity-30', 'scale-90', 'pointer-events-none');

    zone.className = 'drop-zone placed-spot w-16 h-16 rounded-full flex flex-col items-center justify-center z-20 cursor-pointer';
    zone.setAttribute('data-player-id', playerId);
    zone.setAttribute('data-player-username', username);
    zone.setAttribute('data-player-name', name);
    zone.setAttribute('data-player-avatar', avatar);

    const removeBtnHtml = activeVestiaireMode === 'edit'
        ? `<button type="button" onclick="event.stopPropagation(); retirerJoueurDuTerrain('${spotIdx}')" title="Remettre dans les gradins" class="export-hide-el pointer-events-auto absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow border border-white z-30">✕</button>`
        : '';

    zone.innerHTML = `
        <div onclick="ouvrirProfilPublicJoueur('${username}')" class="spot-pop-in relative flex flex-col items-center">
            <div class="mvp-crown-slot hidden absolute -top-4 left-1/2 -translate-x-1/2 text-base drop-shadow-md z-30 pointer-events-none">👑</div>
            ${removeBtnHtml}
            <div class="avatar-ring w-12 h-12 rounded-full p-0.5 bg-white shadow-xl border-2 border-white pointer-events-none">
                <img src="${avatar}" crossorigin="anonymous" class="w-full h-full rounded-full object-cover">
            </div>
            <span class="-mt-1 bg-zinc-950 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap border border-white/25 pointer-events-none">
                ${name}
            </span>
        </div>
    `;
    selectedTapCard = null;
}

function retirerJoueurDuTerrain(spotIdx) {
    const root = document.getElementById('modal-vestiaire-equipe');
    if (!root) return;
    const zone = root.querySelector(`.drop-zone[data-spot-idx="${spotIdx}"]`);
    if (!zone) return;

    const playerId = zone.getAttribute('data-player-id');
    const role = zone.getAttribute('data-role') || 'Poste';

    if (playerId) {
        const benchCard = root.querySelector(`.bench-player-card[data-player-id="${playerId}"]`);
        if (benchCard) {
            benchCard.classList.remove('opacity-30', 'scale-90', 'pointer-events-none');
            if (!benchCard.querySelector('.place-moi-badge')) {
                benchCard.insertAdjacentHTML('afterbegin', '<span class="place-moi-badge">PLACE MOI</span>');
            }
        }
    }

    zone.className = 'drop-zone w-14 h-14 rounded-full border-2 border-dashed border-white/80 bg-black/30 flex flex-col items-center justify-center z-10 cursor-pointer';
    zone.removeAttribute('data-player-id');
    zone.removeAttribute('data-player-name');
    zone.innerHTML = `
        <i class="fas fa-plus text-white/80 text-xs pointer-events-none"></i>
        <span class="text-[8px] font-extrabold uppercase text-white/95 tracking-wider mt-0.5 pointer-events-none">${role}</span>
    `;
}

function couronnerJoueurSurSpot(zone) {
    const root = document.getElementById('modal-vestiaire-equipe');
    if (!root || !zone) return;
    const playerName = zone.getAttribute('data-player-name') || 'Joueur';

    root.querySelectorAll('.mvp-crown-slot').forEach(el => el.classList.add('hidden'));
    root.querySelectorAll('.avatar-ring').forEach(el => el.classList.remove('!bg-amber-400', '!border-amber-300'));

    zone.querySelector('.mvp-crown-slot')?.classList.remove('hidden');
    zone.querySelector('.avatar-ring')?.classList.add('!bg-amber-400', '!border-amber-300');

    const pill = document.getElementById('story-mvp-pill');
    const nameEl = document.getElementById('story-mvp-name');
    if (pill && nameEl) {
        nameEl.innerText = playerName;
        pill.classList.remove('hidden');
    }
}

function activerPinchAndDropVestiaire(root) {
    const playerCards = root.querySelectorAll('.bench-player-card');
    const crownBench = document.getElementById('draggable-mvp-crown');
    const zones = root.querySelectorAll('.drop-zone');

    // Support Tap-to-Select & Tap-to-Place (idéal sur mobile) + Pinch & Drag
    zones.forEach(zone => {
        zone.onclick = () => {
            if (activeVestiaireMode === 'read') return;
            if (selectedTapCard) {
                placerJoueurSurSpot(selectedTapCard, zone);
            }
        };
    });

    playerCards.forEach(card => {
        card.onclick = () => {
            if (activeVestiaireMode === 'read') {
                ouvrirProfilPublicJoueur(card.getAttribute('data-player-username'));
                return;
            }
            playerCards.forEach(c => c.querySelector('.bench-avatar-ring')?.classList.remove('ring-4', 'ring-[#d9f99d]'));
            selectedTapCard = card;
            card.querySelector('.bench-avatar-ring')?.classList.add('ring-4', 'ring-[#d9f99d]');
        };

        card.onpointerdown = (e) => {
            if (activeVestiaireMode === 'read') return;
            e.preventDefault();
            isDraggingMvpCrown = false;
            activePinchCard = card;
            selectedTapCard = card;

            const avatarUrl = card.getAttribute('data-player-avatar');
            activePinchGhost = document.createElement('div');
            activePinchGhost.className = 'pinched-player-ghost';
            activePinchGhost.style.left = `${e.clientX}px`;
            activePinchGhost.style.top = `${e.clientY}px`;
            activePinchGhost.innerHTML = `<img src="${avatarUrl}" class="w-full h-full rounded-full object-cover">`;
            document.body.appendChild(activePinchGhost);
        };
    });

    if (crownBench) {
        crownBench.onpointerdown = (e) => {
            if (activeVestiaireMode === 'read') return;
            e.preventDefault();
            isDraggingMvpCrown = true;
            activePinchCard = crownBench;

            activePinchGhost = document.createElement('div');
            activePinchGhost.className = 'pinched-crown-ghost';
            activePinchGhost.style.left = `${e.clientX}px`;
            activePinchGhost.style.top = `${e.clientY}px`;
            activePinchGhost.innerHTML = '👑';
            document.body.appendChild(activePinchGhost);
        };
    }

    if (vestiaireListenersBound) return;
    vestiaireListenersBound = true;

    window.addEventListener('pointermove', (e) => {
        if (!activePinchGhost) return;
        activePinchGhost.style.left = `${e.clientX}px`;
        activePinchGhost.style.top = `${e.clientY}px`;

        const modalRoot = document.getElementById('modal-vestiaire-equipe');
        if (!modalRoot) return;
        modalRoot.querySelectorAll('.drop-zone').forEach(zone => {
            const rect = zone.getBoundingClientRect();
            const dist = Math.hypot(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
            zone.classList.toggle('tactical-spot-highlight', dist < 48);
        });
    });

    window.addEventListener('pointerup', (e) => {
        if (!activePinchGhost || !activePinchCard) return;

        const modalRoot = document.getElementById('modal-vestiaire-equipe');
        const allZones = modalRoot ? Array.from(modalRoot.querySelectorAll('.drop-zone')) : [];
        let bestZone = null;
        let minDistance = 58;

        allZones.forEach(zone => {
            zone.classList.remove('tactical-spot-highlight');
            const rect = zone.getBoundingClientRect();
            const dist = Math.hypot(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
            if (dist < minDistance) {
                minDistance = dist;
                bestZone = zone;
            }
        });

        if (bestZone) {
            if (isDraggingMvpCrown) {
                if (bestZone.classList.contains('placed-spot')) couronnerJoueurSurSpot(bestZone);
            } else {
                placerJoueurSurSpot(activePinchCard, bestZone);
            }
        }

        activePinchGhost.remove();
        activePinchGhost = null;
        activePinchCard = null;
        isDraggingMvpCrown = false;
    });
}

// =========================================================================
// EXPORTS PNG TRANSPARENTS SÉPARÉS (FORMATION VS SCORE SEUL) + IMPRESSION A4
// =========================================================================
function mettreAJourScoreStory(val) {
    const pill = document.getElementById('story-score-pill');
    const txt = document.getElementById('story-score-value');
    if (!pill || !txt) return;
    const clean = val.trim();
    if (clean.length > 0) {
        txt.innerText = `SCORE (Entré par l'hôte) : ${clean}`;
        pill.classList.remove('hidden');
    } else {
        pill.classList.add('hidden');
    }
}

function changerStickerVibe(text) {
    const pill = document.getElementById('story-vibe-pill');
    if (!pill) return;
    if (text) {
        pill.innerText = text;
        pill.classList.remove('hidden');
    } else {
        pill.classList.add('hidden');
    }
}

// 1. Export PNG Transparent de la Formation Tactique
async function exporterStoryInstagram() {
    const card = document.getElementById('insta-story-capture-card');
    const field = document.getElementById('tactical-field-edit');
    const btn = document.getElementById('btn-export-insta');
    if (!card || !field || typeof html2canvas === 'undefined') return;

    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PNG...';

    card.style.border = 'none';
    card.style.boxShadow = 'none';
    field.classList.add('sticker-transparent-mode');
    card.querySelectorAll('.export-hide-el').forEach(el => el.classList.add('hidden'));

    try {
        const canvas = await html2canvas(card, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: null });
        const link = document.createElement('a');
        link.download = `LA3BIN-Formation-Sticker-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        btn.innerHTML = '<i class="fas fa-check"></i> Prêt !';
    } catch (err) {
        console.error(err);
    } finally {
        field.classList.remove('sticker-transparent-mode');
        card.querySelectorAll('.export-hide-el').forEach(el => el.classList.remove('hidden'));
        card.style.border = '';
        card.style.boxShadow = '';
    }
    setTimeout(() => { btn.innerHTML = oldHtml; }, 1600);
}

// 2. Export PNG Transparent du Score Seul (Format Sticker Story)
async function exporterScoreSeulInstagram() {
    const scoreVal = document.getElementById('insta-score-input')?.value.trim() || '6-4 / 6-3';
    const titleVal = document.getElementById('vestiaire-equipe-titre')?.innerText || 'Match LA3BIN!';
    const mvpVal = document.getElementById('story-mvp-name')?.innerText || '';

    const tempSticker = document.createElement('div');
    tempSticker.style.cssText = 'position:fixed; left:-9999px; top:0; width:420px; padding:28px; font-family:Inter,sans-serif; background:transparent;';
    tempSticker.innerHTML = `
        <div style="background:rgba(15, 41, 34, 0.92); border:2px solid #d9f99d; border-radius:28px; padding:24px; text-align:center; color:white; box-shadow:0 20px 40px rgba(0,0,0,0.4);">
            <span style="font-size:11px; font-weight:900; letter-spacing:0.15em; color:#d9f99d; text-transform:uppercase;">LA3BIN! · RÉSULTAT OFFICIEL</span>
            <h2 style="font-size:20px; font-weight:900; margin:6px 0 12px 0; text-transform:uppercase;">${titleVal}</h2>
            <div style="font-size:38px; font-weight:900; color:#d9f99d; letter-spacing:0.06em; margin:8px 0;">${scoreVal}</div>
            ${mvpVal ? `<div style="display:inline-block; margin-top:10px; background:#fbbf24; color:#09090b; font-size:11px; font-weight:900; padding:4px 14px; border-radius:999px;">👑 MVP : ${mvpVal}</div>` : ''}
            <p style="font-size:10px; color:#a1a1aa; margin-top:12px; font-weight:700;">l3eb ila baghi tl3eb · Casablanca</p>
        </div>
    `;
    document.body.appendChild(tempSticker);

    try {
        const canvas = await html2canvas(tempSticker, { scale: 2, backgroundColor: null });
        const link = document.createElement('a');
        link.download = `LA3BIN-Score-Sticker-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {} finally {
        tempSticker.remove();
    }
}

function imprimerFormationVestiaire() {
    const title = document.getElementById('vestiaire-equipe-titre')?.innerText || 'Match LA3BIN!';
    const score = document.getElementById('insta-score-input')?.value.trim() || 'À jouer (Non confirmé)';
    const mvp = document.getElementById('story-mvp-name')?.innerText || '';

    document.getElementById('print-sheet-title').innerText = title;
    document.getElementById('print-sheet-score').innerText = `Score : ${score} ${mvp ? `· 👑 MVP : ${mvp}` : ''}`;
    document.getElementById('print-sheet-date').innerText = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    const playersBox = document.getElementById('print-sheet-players');
    if (playersBox) {
        playersBox.innerHTML = '';
        document.querySelectorAll('#formation-spots-edit .drop-zone').forEach(z => {
            const role = z.getAttribute('data-role') || 'Poste';
            const pName = z.getAttribute('data-player-name') || 'Poste libre';
            playersBox.insertAdjacentHTML('beforeend', `
                <div style="border: 1px solid #d4d4d8; border-radius: 10px; padding: 10px 14px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size: 11px; font-weight: 800; color: #71717a; text-transform: uppercase;">${role}</span>
                    <span style="font-size: 13px; font-weight: 900; color: #0f392b;">${pName}</span>
                </div>
            `);
        });
    }

    window.print();
}