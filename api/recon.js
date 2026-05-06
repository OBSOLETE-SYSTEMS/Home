// api/recon.js                                                               
  // Vercel serverless function - calls Claude to generate a recon.
                                                                                  
  export default async function handler(req, res) {
    if (req.method !== 'POST') {                                                  
      return res.status(405).json({ error: 'Method not allowed' });               
    }                                                          
                                                                                  
    const apiKey = process.env.ANTHROPIC_API_KEY;                               
    if (!apiKey) {                              
      return res.status(500).json({ error: 'No API key configured' });            
    }                                                                             
                                                                                  
    let body = req.body;                                                          
    if (typeof body === 'string') {                                             
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }                                                                             
                                                  
    const category = (body && body.category) || '';                               
    const brand = (body && body.brand) || '';                                   
    const bottleneck = (body && body.bottleneck) || '';
    const differentiator = (body && body.differentiator) || '';                   
    const competitors = (body && body.competitors) || '';
                                                                                  
    if (!category || !brand || !bottleneck) {                                   
      return res.status(400).json({ error: 'Missing fields: category, brand, 
  bottleneck' });                                                                 
    }                                               
                                                                                  
    const prompt =                                                              
      "You are a strategic creative analyst that produces shippable creative      
  briefs in the brand voice.\n" +                   
      "\n" +                                                                      
      "Return ONLY a valid JSON object. No prose. No markdown fences. Shape:\n" +
      "\n" +                                                                      
      '{\n' +                                     
      '  "intel": {\n' +                                                          
      '    "signal": { "tag": "SHORT", "text": "one sentence on what is emerging" 
  },\n' +                                         
      '    "gap":    { "tag": "SHORT", "text": "one sentence on what competitors  
  miss" },\n' +                                                
      '    "window": { "tag": "TIMING", "text": "one sentence on urgency" }\n' +  
      '  },\n' +                                                                  
      '  "briefs": [\n' +                                      
      '    { "id": "01", "briefType": "content", "type": "LABEL", "platform":     
  "...", "urgency": "TIMING", "title": "...", "rows":                             
  [{"k":"Format","v":"..."},{"k":"Hook","v":"...","hl":true},{"k":"Visual","v":"..
  ."},{"k":"Caption","v":"..."},{"k":"Posting","v":"..."}], "why": "..." },\n' +  
      '    { "id": "02", "briefType": "pr",      "type": "LABEL", "platform":     
  "...", "urgency": "TIMING", "title": "...", "rows":                           
  [{"k":"Targets","v":"..."},{"k":"Angle","v":"...","hl":true},{"k":"Assets","v":"
  ..."},{"k":"Method","v":"..."},{"k":"Window","v":"..."}], "why": "..." },\n' +
      '    { "id": "03", "briefType": "media",   "type": "LABEL", "platform":     
  "...", "urgency": "TIMING", "title": "...", "rows":                             
  [{"k":"Objective","v":"..."},{"k":"Audience","v":"..."},{"k":"Creative","v":"...
  "},{"k":"Budget","v":"..."},{"k":"Expected KPI","v":"..."}], "why": "..." }\n' +
      '  ]\n' +                                                                 
      '}\n' +                                                                     
      "\n" +                                        
      "RULES:\n" +                                                                
      "- briefType must be content, media, or pr.\n" +                          
      "- Hook or Angle row must have hl: true.\n" +                               
      "- Tags under 12 chars (examples: +340%, 3 BEATS, OPEN, 72 HR, 2-WK).\n" +
      "- Urgency in caps (examples: RIDE NOW, LAUNCH MON, FRI DROP).\n" +         
      "- Be specific. Hooks and angles in quotes, sound like a real person.\n" +
      "- Avoid AI jargon: leverage, synergy, AI-powered.\n" +  
      "\n" +                                                                      
      "INPUTS:\n" +                                            
      "Category: " + category + "\n" +                                            
      "Brand: " + brand + "\n" +                                                
      "Differentiator: " + (differentiator || "(infer from category)") + "\n" +   
      "Competitors: " + (competitors || "(use category leaders)") + "\n" +        
      "Bottleneck: " + bottleneck + "\n" +                                        
      "\n" +                                                                      
      "Generate the recon now. Return ONLY the JSON object.";                     
                                                                                  
    try {                                                                         
      const apiResp = await fetch('https://api.anthropic.com/v1/messages', {    
        method: 'POST',                                                           
        headers: {                                                                
          'x-api-key': apiKey,                         
          'anthropic-version': '2023-06-01',                                      
          'content-type': 'application/json',                                   
        },                                                                        
        body: JSON.stringify({                                                  
          model: 'claude-sonnet-4-6',                          
          max_tokens: 4000,                                                       
          messages: [{ role: 'user', content: prompt }],
        }),                                                                       
      });                                                                       
                                                                                  
      if (!apiResp.ok) {                                       
        const errText = await apiResp.text();                                     
        return res.status(502).json({ error: 'API call failed', detail: errText 
  });                     
      }                                         
                                                                                  
      const data = await apiResp.json();                       
      const content = data && data.content && data.content[0] &&                  
  data.content[0].text;                                                         
      if (!content) {
        return res.status(502).json({ error: 'No content in response' });
      }                                                                           
                                                       
      let cleaned = content.trim();                                               
      const first = cleaned.indexOf('{');                                       
      const last = cleaned.lastIndexOf('}');        
      if (first > -1 && last > first) {
        cleaned = cleaned.slice(first, last + 1);
      }                                                                           
                                                               
      let parsed;                                                                 
      try {                                                                     
        parsed = JSON.parse(cleaned);             
      } catch (e) {                                 
        return res.status(502).json({ error: 'Failed to parse JSON from model',   
  raw: content });        
      }                                                                           
                                                                                
      return res.status(200).json(parsed);                                        
    } catch (err) {                                                             
      return res.status(500).json({ error: 'Server error', detail: String((err &&
  err.message) || err) });
    }                                           
  }
