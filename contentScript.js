const scrapeConfigs = {
  "amazon.in": [
    { selector: ".grand-total-price" }, // Final checkout total
    { selector: "#sc-subtotal-amount-buybox .a-size-medium" }, // Cart page
    { selector: "#spc-order-summary-total > span" }, // Checkout page
    { selector: "#subtotals-marketplace-table .a-text-bold" },
    { selector: "span[data-testid='order-summary-total']" },
    { selector: "#total-amount-value" },
    { selector: ".a-color-price.a-text-bold" }
  ],
  "flipkart.com": [
    { selector: "._1Y9Lgu ._3LxTgx" },
    { selector: ".Ob17DV ._1AtVbE ._30jeq3" }, // Cart Price
    { selector: "._2tD0yG ._25b18c ._30jeq3" } // Checkout
  ],
  "swiggy.com": [
    { selector: "._3d6_p" },
    { selector: "[data-cy='searchResultsTotal']" }
  ],
  "zomato.com": [
    { selector: ".tUvKx" },
    { selector: "section[class*='TotalContainer'] span" }
  ],
  "myntra.com": [
    { selector: ".price-details-total .price-details-value" },
    { selector: ".bulk-action-bar-total-amount" }
  ],
  "ajio.com": [
    { selector: ".net-price" },
    { selector: ".order-summary-value" }
  ],
  "tatacliq.com": [
    { selector: ".CartPage__totalAmountValue" },
    { selector: ".PriceDetails__totalValue" }
  ]
};

function getMerchantSlug() {
  const hostname = window.location.hostname;
  if (hostname.includes('amazon.in')) return 'amazon';
  if (hostname.includes('flipkart.com')) return 'flipkart';
  if (hostname.includes('swiggy.com')) return 'swiggy';
  if (hostname.includes('zomato.com')) return 'zomato';
  if (hostname.includes('myntra.com')) return 'myntra';
  if (hostname.includes('ajio.com')) return 'ajio';
  return null;
}

function parseAmount(text) {
  if (!text) return null;
  const sanitized = text.replace(/[^\d.]/g, '');
  const amount = parseFloat(sanitized);
  return isNaN(amount) ? null : amount;
}

let lastSentAmount = null;
function sendContext() {
  console.log("[BCO] Running sendContext...");
  const merchantSlug = getMerchantSlug();
  if (!merchantSlug) {
    console.log("[BCO] Merchant slug not found for this hostname.");
    return;
  }

  const configs = scrapeConfigs[Object.keys(scrapeConfigs).find(k => window.location.hostname.includes(k))];
  if (!configs) { console.log(`[BCO] No scrape configs for ${merchantSlug}`); return; }

  for (const config of configs) {
    const element = document.querySelector(config.selector);
    if (element && element.textContent) {
      const amount = parseAmount(element.textContent);
      if (amount && amount !== lastSentAmount) {
        lastSentAmount = amount;
        console.log(`[BCO] Found amount: ${amount}. Sending to background script.`);
        chrome.runtime.sendMessage({
          type: "TXN_CONTEXT",
          data: {
            merchantSlug,
            category: "online_shopping",
            amount
          }
        });
        return; // Send first valid amount found
      }
    }
  }
  console.log("[BCO] Finished checking all selectors. No new amount found.");
}

// Run on load and observe for changes
const observer = new MutationObserver(sendContext);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('load', sendContext);
setTimeout(sendContext, 2000); // Fallback check
