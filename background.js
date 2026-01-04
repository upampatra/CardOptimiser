// background.js

let cards, reward_rules, offers;

const DATA_URLS = {
    cards: 'https://raw.githubusercontent.com/upampatra/CardOptimiser/main/data/cards.json',
    rules: 'https://raw.githubusercontent.com/upampatra/CardOptimiser/main/data/reward_rules.json',
    offers: 'https://raw.githubusercontent.com/upampatra/CardOptimiser/main/data/offers.json'
};

async function loadData() {
    try {
        console.log("[BCO] Attempting to fetch remote data...");
        // Try fetching from remote first
        const [cards_res, rules_res, offers_res] = await Promise.all([
            fetch(DATA_URLS.cards).catch(() => null),
            fetch(DATA_URLS.rules).catch(() => null),
            fetch(DATA_URLS.offers).catch(() => null)
        ]);

        if (cards_res && cards_res.ok) cards = await cards_res.json();
        else cards = await (await fetch(chrome.runtime.getURL('data/cards.json'))).json();

        if (rules_res && rules_res.ok) reward_rules = await rules_res.json();
        else reward_rules = await (await fetch(chrome.runtime.getURL('data/reward_rules.json'))).json();

        if (offers_res && offers_res.ok) offers = await offers_res.json();
        else offers = await (await fetch(chrome.runtime.getURL('data/offers.json'))).json();

        // Cache data for future use (optional, relying on variable for now)
        console.log("[BCO] Data loaded successfully.");
    } catch (e) {
        console.error("Failed to load extension data:", e);
        // Fallback to local if anything critical fails
        cards = await (await fetch(chrome.runtime.getURL('data/cards.json'))).json();
        reward_rules = await (await fetch(chrome.runtime.getURL('data/reward_rules.json'))).json();
        offers = await (await fetch(chrome.runtime.getURL('data/offers.json'))).json();
    }
}

async function calculateBestCards(context) {
    if (!cards || !reward_rules || !offers) {
        await loadData();
    }

    const { userCards } = await chrome.storage.sync.get({ userCards: [] });
    if (!userCards || userCards.length === 0) return [];

    const results = [];
    const now = new Date();

    for (const cardId of userCards) {
        const cardInfo = cards.find(c => c.id === cardId);
        if (!cardInfo) continue;

        let rewardProgramValue = 0, rewardExplanation = "", offerValue = 0, offerExplanation = "";

        // 1. Calculate Reward Program Value (New Logic)
        const ruleConfig = reward_rules.find(r => r.cardId === cardId);
        if (ruleConfig) {
            let bestRule = null;

            // Check merchant specific rules
            if (ruleConfig.merchants) {
                bestRule = ruleConfig.merchants.find(m => m.slugs.includes(context.merchantSlug));
            }

            if (bestRule) {
                let value = context.amount * bestRule.rate;
                rewardProgramValue = bestRule.cap ? Math.min(value, bestRule.cap) : value;
                rewardExplanation = bestRule.explanation;
            } else {
                // Default Base Rate
                let value = context.amount * ruleConfig.baseRate;
                rewardProgramValue = value; // Apply global caps if needed, simple for now
                rewardExplanation = ruleConfig.defaultExplanation;

                // Special Case: Infinia Points Value
                if (ruleConfig.type === 'points') {
                    rewardProgramValue = rewardProgramValue * (ruleConfig.valuePerPoint || 1);
                }
            }
        }

        // 2. Calculate Active Offer Value
        // Note: keeping offer logic simple for now, can be expanded later
        const activeOffer = offers.find(o => {
            return o.merchant === context.merchantSlug &&
                now >= new Date(o.startDate) && now <= new Date(o.endDate) &&
                context.amount >= o.minTxn &&
                o.cardIssuer === cardInfo.issuer;
        });

        if (activeOffer) {
            let discount = context.amount * activeOffer.value;
            offerValue = activeOffer.maxValue ? Math.min(discount, activeOffer.maxValue) : discount;
            offerExplanation = activeOffer.explanation;
        }

        const totalValue = rewardProgramValue + offerValue;
        if (totalValue > 0) {
            results.push({
                cardId, cardName: cardInfo.name,
                totalValue: parseFloat(totalValue.toFixed(2)),
                rewardProgramValue: parseFloat(rewardProgramValue.toFixed(2)),
                offerValue: parseFloat(offerValue.toFixed(2)),
                explanation: [offerExplanation, rewardExplanation].filter(Boolean).join(' + '),
                color: cardInfo.color // Pass color for UI
            });
        }
    }

    return results.sort((a, b) => b.totalValue - a.totalValue);
}

// Optional: Clean up storage when a tab is closed to prevent memory leaks
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(`context_${tabId}`);
});