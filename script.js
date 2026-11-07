function showSection(sectionId) {
    document.querySelectorAll('body > div').forEach(div => div.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
}

// ==========================================
// 💰 CASH GAME (inchangé)
// ==========================================
let players = [];

function updatePlayerList() {
    let list = document.getElementById('players-list');
    list.innerHTML = "";
    players.forEach(p => { list.innerHTML += `<p>👤 <b>${p.name}</b> a posé : <b>${p.buyin} €</b></p>`; });
}

function addPlayer() {
    let nameInput = document.getElementById('new-player-name');
    let buyinInput = document.getElementById('new-player-buyin');
    let name = nameInput.value.trim();
    let buyin = parseFloat(buyinInput.value);

    if (name === "" || isNaN(buyin) || buyin <= 0) return alert("Nom invalide ou montant vide.");

    let existingPlayer = players.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingPlayer) {
        existingPlayer.buyin += buyin;
        alert(`🚨 RECAVE ! ${name} a remis ${buyin} €. Total : ${existingPlayer.buyin} €`);
    } else {
        players.push({ name: name, buyin: buyin });
    }
    updatePlayerList();
    nameInput.value = ""; buyinInput.value = "";
}

function endGame() {
    if (players.length < 2) return alert("Au moins 2 joueurs nécessaires !");
    showSection('end-game');
    let finalStacksDiv = document.getElementById('final-stacks');
    finalStacksDiv.innerHTML = "";
    players.forEach((player, index) => {
        finalStacksDiv.innerHTML += `
            <div style="margin-bottom: 15px; background: #141414; padding: 10px; border-radius: 5px;">
                <label><b>${player.name}</b> (Misés: ${player.buyin}€) finit avec : 
                    <input type="number" id="final-stack-${index}" placeholder="Jetons (€)">
                </label>
            </div>
        `;
    });
}

function calculatePayouts() {
    let totalBuyin = 0, totalEndStack = 0;
    players.forEach((player, index) => {
        let finalStack = parseFloat(document.getElementById(`final-stack-${index}`).value) || 0;
        player.net = finalStack - player.buyin;
        totalBuyin += player.buyin; totalEndStack += finalStack;
    });

    if (Math.abs(totalBuyin - totalEndStack) > 0.5) alert("🚨 Erreur de caisse ! Des jetons ont disparu.");

    generateDebtHTML(players, 'results');
}

// ==========================================
// ⏱️ TOURNOI (NOUVEAU MOTEUR AVEC JOUEURS)
// ==========================================
let tPlayers = []; // { name: "Bob", entries: 1, isEliminated: false }
let tBuyIn = 10;
let tChips = 1000;
let tTotalPrizePool = 0;

function addTourneyPlayer() {
    let nameInput = document.getElementById('t-new-player-name');
    let name = nameInput.value.trim();
    if (name === "") return;
    
    // On ne compte les "entries" qu'au lancement
    tPlayers.push({ name: name, entries: 1, isEliminated: false });
    nameInput.value = "";
    
    let list = document.getElementById('t-players-setup-list');
    list.innerHTML = "";
    tPlayers.forEach(p => { list.innerHTML += `<p>👤 ${p.name}</p>`; });
}

const blindLevels = [
    "5 / 10", "10 / 20", "15 / 30", "20 / 40", "25 / 50", 
    "30 / 60", "40 / 80", "50 / 100", "75 / 150", "100 / 200"
];
let timerInterval;
let timeRemaining = 0;
let levelDuration = 0;
let currentLevel = 0;
let isRunning = false;

function startTournament() {
    if (tPlayers.length < 2) return alert("Ajoute au moins 2 joueurs !");
    
    tBuyIn = parseFloat(document.getElementById('tourney-buyin').value);
    tChips = parseInt(document.getElementById('tourney-chips').value);
    tTotalPrizePool = tPlayers.length * tBuyIn;

    let minutes = parseInt(document.getElementById('tourney-speed').value);
    levelDuration = minutes * 60;
    timeRemaining = levelDuration;
    currentLevel = 0;
    
    showSection('active-tournament');
    updateTourneyStats();
    updateInterface();
    renderLivePlayers();
    
    if (!isRunning) toggleTimer();
}

function updateTourneyStats() {
    document.getElementById('stat-prizepool').innerText = `${tTotalPrizePool} €`;
    
    let playersLeft = tPlayers.filter(p => !p.isEliminated).length;
    let totalEntries = tPlayers.reduce((sum, p) => sum + p.entries, 0);
    
    document.getElementById('stat-players').innerText = `${playersLeft} / ${totalEntries} (entrées)`;
    
    let avg = Math.round((totalEntries * tChips) / (playersLeft || 1));
    document.getElementById('stat-avg').innerText = avg;
}

function renderLivePlayers() {
    let list = document.getElementById('t-live-players-list');
    list.innerHTML = "";
    tPlayers.forEach((p, index) => {
        let statusClass = p.isEliminated ? "eliminated" : "";
        let totalSpent = p.entries * tBuyIn;
        let actions = p.isEliminated ? `<i>Éliminé(e)</i>` : `
            <button class="btn-small-rebuy" onclick="rebuyTourneyPlayer(${index})">💰 Recave</button>
            <button class="btn-small-kill" onclick="killTourneyPlayer(${index})">💀 Out</button>
        `;
        
        list.innerHTML += `
            <div class="t-live-player ${statusClass}">
                <div><b>${p.name}</b> <span style="color:#888;font-size:0.9em;">(Misés: ${totalSpent}€)</span></div>
                <div class="t-actions">${actions}</div>
            </div>
        `;
    });
}

function rebuyTourneyPlayer(index) {
    if (confirm(`${tPlayers[index].name} prend une recave de ${tBuyIn}€ ?`)) {
        tPlayers[index].entries++;
        tTotalPrizePool += tBuyIn;
        updateTourneyStats();
        renderLivePlayers();
    }
}

function killTourneyPlayer(index) {
    tPlayers[index].isEliminated = true;
    updateTourneyStats();
    renderLivePlayers();
    
    let playersLeft = tPlayers.filter(p => !p.isEliminated).length;
    if (playersLeft === 1) alert("🏆 Le Heads-Up est terminé !");
}

function endTournament() {
    if (isRunning) toggleTimer();
    showSection('end-tournament');
    
    document.getElementById('final-prizepool-display').innerText = tTotalPrizePool;
    
    let div = document.getElementById('t-final-payouts');
    div.innerHTML = "";
    
    tPlayers.forEach((p, index) => {
        let totalSpent = p.entries * tBuyIn;
        div.innerHTML += `
            <div style="margin-bottom: 10px; background: #141414; padding: 10px; border-radius: 5px;">
                <label><b>${p.name}</b> (A payé ${totalSpent}€) gagne : 
                    <input type="number" id="t-payout-${index}" value="0" min="0"> €
                </label>
            </div>
        `;
    });
}

function calculateTourneyDebts() {
    let totalPayouts = 0;
    
    // On calcule le profit net de chaque joueur = Gains gagnés - Argent misé
    tPlayers.forEach((p, index) => {
        let winnings = parseFloat(document.getElementById(`t-payout-${index}`).value) || 0;
        totalPayouts += winnings;
        p.net = winnings - (p.entries * tBuyIn); 
    });

    if (totalPayouts !== tTotalPrizePool) {
        alert(`🚨 Erreur ! Vous avez distribué ${totalPayouts}€ au lieu des ${tTotalPrizePool}€ du Prize Pool !`);
    }

    generateDebtHTML(tPlayers, 't-results');
}

// ==========================================
// ⚙️ ALGORITHME COMMUN (DETTES) & CHRONO
// ==========================================
function generateDebtHTML(playersArray, containerId) {
    let winners = playersArray.filter(p => p.net > 0).sort((a, b) => b.net - a.net);
    let losers = playersArray.filter(p => p.net < 0).sort((a, b) => a.net - b.net);
    let resultsHtml = "<h3 style='color: #d90429;'>💸 Verdict de la soirée :</h3>";

    let i = 0, j = 0; 
    while (i < winners.length && j < losers.length) {
        let winner = winners[i], loser = losers[j];
        let amount = Math.min(winner.net, Math.abs(loser.net));
        
        resultsHtml += `<div class="payout-line">🎯 <b>${loser.name}</b> fait un virement de <b>${amount.toFixed(2)}€</b> à <b>${winner.name}</b></div>`;
        
        winner.net -= amount; 
        loser.net += amount;
        
        if (winner.net < 0.01) i++;
        if (Math.abs(loser.net) < 0.01) j++;
    }
    if (winners.length === 0 && losers.length === 0) resultsHtml += "<p>Équilibre parfait, pas de dettes !</p>";
    document.getElementById(containerId).innerHTML = resultsHtml;
}

// Chrono basé sur l'horloge du téléphone (Anti-mise en veille)
let targetEndTime = 0;

function updateInterface() {
    document.getElementById('current-blinds-display').innerText = `Blindes : ${blindLevels[currentLevel]}`;
    document.getElementById('next-blinds-display').innerText = blindLevels[currentLevel + 1] || "Fin";
    
    // On empêche l'affichage d'un temps négatif
    let displayTime = Math.max(0, timeRemaining);
    let m = Math.floor(displayTime / 60).toString().padStart(2, '0');
    let s = (displayTime % 60).toString().padStart(2, '0');
    document.getElementById('time-display').innerText = `${m}:${s}`;
}

function toggleTimer() {
    let btn = document.getElementById('play-pause-btn');
    if (isRunning) {
        // Mode Pause
        clearInterval(timerInterval);
        btn.innerText = "▶️ Reprendre"; 
        isRunning = false;
    } else {
        // Mode Lecture (on calcule l'heure exacte de fin)
        targetEndTime = Date.now() + (timeRemaining * 1000);
        
        timerInterval = setInterval(() => {
            let now = Date.now();
            // On calcule l'écart entre l'heure de fin prévue et l'heure actuelle
            timeRemaining = Math.round((targetEndTime - now) / 1000);
            
            if (timeRemaining > 0) { 
                updateInterface(); 
            } else { 
                // Le temps est écoulé
                timeRemaining = 0;
                updateInterface();
                alert("🚨 BLINDES UP !"); 
                nextLevel(); 
            }
        }, 1000); // Mise à jour de l'affichage toutes les secondes
        
        btn.innerText = "⏸️ Pause"; 
        isRunning = true;
    }
}

function nextLevel() {
    if (currentLevel < blindLevels.length - 1) {
        currentLevel++; 
        timeRemaining = levelDuration; 
        
        if (isRunning) {
            // Si le chrono tourne déjà, on recalcule la nouvelle heure de fin
            targetEndTime = Date.now() + (timeRemaining * 1000);
        }
        
        updateInterface();
    } else {
        clearInterval(timerInterval); 
        isRunning = false; 
        alert("Dernier niveau !");
    }
}

// Enregistrement du Service Worker pour l'installation sur mobile
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('Service Worker enregistré !', reg);
        }).catch(err => {
            console.log('Échec du Service Worker', err);
        });
    });
}
