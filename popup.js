document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loadingState');
    const unsupportedState = document.getElementById('unsupportedState');
    const resultsState = document.getElementById('resultsState');
    const noCardsState = document.getElementById('noCardsState');
    const manualInputState = document.getElementById('manualInputState');

    const manageCardsBtn = document.getElementById('manageCardsBtn');
    const goToOptionsBtn = document.getElementById('goToOptionsBtn');

    // Manual Input Buttons
    const manualBtn = document.createElement('button'); // Injected into unsupported state
    manualBtn.textContent = 'Check Manually';
    manualBtn.className = 'secondary-btn';

    // Elements in unsupported state
    const unsupportedContent = document.querySelector('#unsupportedState p');

    const recheckBtn = document.getElementById('recheckBtn');
    const calculateBtn = document.getElementById('calculateBtn');
    const backBtn = document.getElementById('backBtn');
    const manualMerchant = document.getElementById('manualMerchant');
    const manualAmount = document.getElementById('manualAmount');

    manageCardsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    goToOptionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

    if (recheckBtn) recheckBtn.addEventListener('click', showManualInput);
    if (backBtn) backBtn.addEventListener('click', hideManualInput);
    if (calculateBtn) calculateBtn.addEventListener('click', handleManualCalculation);

    function showManualInput() {
        resultsState.classList.add('hidden');
        unsupportedState.classList.add('hidden');
        noCardsState.classList.add('hidden');
        manualInputState.classList.remove('hidden');
    }

    function hideManualInput() {
        manualInputState.classList.add('hidden');
        // Re-initiate normal check or go to empty state
        init();
    }

    function handleManualCalculation() {
        const merchant = manualMerchant.value;
        const amount = parseFloat(manualAmount.value);

        if (!merchant || isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        loadingState.classList.remove('hidden');
        manualInputState.classList.add('hidden');

        // Construct a mock context
        const context = {
            merchantSlug: merchant,
            amount: amount,
            manual: true
        };

        // Send to background directly via a new message type ideally, 
        // but here we can just simulate the response logic by requesting calculation
        // For now, let's reuse the pattern:
        // We can't easily "inject" context into background storage for a tab that doesn't exist conceptually for manual check
        // So we will ask background to calculate for a transient object.

        // Let's modify background to accept a raw context payload for calculation if possible?
        // Or simpler: We just send a message that we want to calculate given this data.

        chrome.runtime.sendMessage({
            type: "CALCULATE_MANUAL",
            data: context
        }, (response) => {
            renderResults(context, response.results);
        });
    }

    function renderResults(context, results) {
        loadingState.classList.add('hidden');

        if (!context || !context.amount) {
            // Context missing (and not manual)
            unsupportedState.classList.remove('hidden');
            if (!unsupportedState.contains(manualBtn)) unsupportedState.appendChild(manualBtn);
            manualBtn.onclick = showManualInput;
            return;
        }

        if (!results || results.length === 0) {
            chrome.storage.sync.get("userCards", ({ userCards }) => {
                if (!userCards || userCards.length === 0) {
                    noCardsState.classList.remove('hidden');
                } else {
                    unsupportedState.classList.remove('hidden');
                    unsupportedState.innerHTML = `<p>No special rewards or offers found for your cards on <b style="text-transform: capitalize;">${context.merchantSlug}</b> for an amount of <b>₹${context.amount}</b>.</p>`;
                    unsupportedState.appendChild(manualBtn);
                    manualBtn.onclick = showManualInput;
                }
            });
            return;
        }

        resultsState.classList.remove('hidden');
        document.getElementById('merchantName').textContent = context.merchantSlug;
        document.getElementById('transactionAmount').textContent = `₹${context.amount.toLocaleString('en-IN')}`;

        const [bestCard, ...otherCards] = results;

        // Apply dynamic color if available
        const bestCardEl = document.getElementById('bestCard');
        if (bestCard.color) bestCardEl.style.borderLeftColor = bestCard.color;

        bestCardEl.innerHTML = `
            <div class="card-header">
                <span class="card-name">${bestCard.cardName}</span>
                <span class="total-value">Save ₹${bestCard.totalValue.toLocaleString('en-IN')}</span>
            </div>
            <p class="explanation">${bestCard.explanation}</p>
            <div class="breakdown">
                <span>Offer: ₹${bestCard.offerValue.toLocaleString('en-IN')}</span>
                <span>Rewards: ₹${bestCard.rewardProgramValue.toLocaleString('en-IN')}</span>
            </div>
        `;

        const otherCardsEl = document.getElementById('otherCards');
        otherCardsEl.innerHTML = '';
        if (otherCards.length > 0) {
            otherCards.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = 'card-result';
                if (card.color) cardEl.style.borderLeftColor = card.color;
                cardEl.innerHTML = `
                    <div class="card-header">
                        <span class="card-name">${card.cardName}</span>
                        <span class="total-value">Save ₹${card.totalValue.toLocaleString('en-IN')}</span>
                    </div>
                `;
                otherCardsEl.appendChild(cardEl);
            });
        } else {
            otherCardsEl.innerHTML = '<p class="no-others">No other card offers a benefit for this transaction.</p>';
        }
    }

    function init() {
        loadingState.classList.remove('hidden');
        unsupportedState.classList.add('hidden');
        resultsState.classList.add('hidden');
        noCardsState.classList.add('hidden');
        manualInputState.classList.add('hidden');

        // Get the active tab to know which context to ask for
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTabId = tabs[0].id;
            chrome.runtime.sendMessage({ type: "GET_RECOMMENDATIONS", tabId: activeTabId }, (response) => {
                // If there's an error (e.g. no background listener), fallback
                if (chrome.runtime.lastError) {
                    console.error("Popup Error:", chrome.runtime.lastError.message);
                    loadingState.classList.add('hidden');
                    unsupportedState.classList.remove('hidden');
                    unsupportedState.appendChild(manualBtn);
                    manualBtn.onclick = showManualInput;
                    return;
                }

                // If context is null, it means scraping failed or not supported site
                // We still want to show "Unsupported" but with a button to Manual
                renderResults(response.context, response.results);
            });
        });
    }

    init();
});
