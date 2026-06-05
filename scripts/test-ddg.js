async function testDDG() {
  const query = "IMDb founders CEO tech stack";
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  const html = await res.text();
  console.log(html.substring(0, 500));
  
  // Extract snippets using regex
  const snippets = [...html.matchAll(/<a class="result__snippet[^>]*>(.*?)<\/a>/g)].map(m => m[1].replace(/<[^>]*>?/gm, ''));
  console.log("Snippets:", snippets);
}
testDDG();
