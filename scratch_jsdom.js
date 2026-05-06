const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('frontend/admin.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously" });

const window = dom.window;
const document = window.document;

// Mock window.prompt
window.prompt = () => "500";
// Mock fetch
window.fetch = async () => ({
  ok: true,
  json: async () => ({})
});

setTimeout(() => {
  try {
    console.log("filterOrders:", typeof window.filterOrders);
    console.log("editProductPrompt:", typeof window.editProductPrompt);
    console.log("updateOrderStatus:", typeof window.updateOrderStatus);
    console.log("promptCreateCoupon:", typeof window.promptCreateCoupon);
    
    // Simulate promptCreateCoupon
    window.promptCreateCoupon().catch(e => console.error(e));
    console.log("promptCreateCoupon called without crashing");
    
  } catch (e) {
    console.error("Error:", e);
  }
}, 500);
