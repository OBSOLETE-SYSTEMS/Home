export default async function handler(req, res) {            
    if (req.method !== "POST") {                  
      return res.status(405).json({ error: "Method not allowed" });               
    }                                                  
    const apiKey = process.env.ANTHROPIC_API_KEY;                                 
    if (!apiKey) {                                                                
      return res.status(500).json({ error: "No API key" });
    }                                                                             
    let body = req.body;                                                        
    if (typeof body === "string") {                                               
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }                                                                             
    if (!body) body = {};                                                       
    const category = body.category || "";                                         
    const brand = body.brand || "";                            
    const bottleneck = body.bottleneck || "";                                     
    const differentiator = body.differentiator || "";                           
    const competitors = body.competitors || "";        
    if (!category || !brand || !bottleneck) {                  
      return res.status(400).json({ error: "Missing fields" });                   
    }                                               
                                                                                  
    const lines = [];                                                           
    lines.push("You are a strategic creative analyst.");                          
    lines.push("Produce a recon for this brand as a JSON object.");
    lines.push("");                                                               
    lines.push("INPUTS:");                                                      
    lines.push("Category: " + category);                                          
    lines.push("Brand: " + brand);                             
    lines.push("Differentiator: " + (differentiator || "(infer)"));               
    lines.push("Competitors: " + (competitors || "(leaders)"));                 
    lines.push("Bottleneck: " + bottleneck);           
    lines.push("");                                            
    lines.push("OUTPUT JSON SHAPE:");                                             
    lines.push("{");                                           
    lines.push('  "intel": {');                                                   
    lines.push('    "signal": { "tag": "SHORT", "text": "..." },');             
    lines.push('    "gap":    { "tag": "SHORT", "text": "..." },');               
    lines.push('    "window": { "tag": "TIMING", "text": "..." }');
    lines.push("  },");                                                           
    lines.push('  "briefs": [ 3 items - see fields below ]');                   
    lines.push("}");                                                              
    lines.push("");                                                             
    lines.push("Each brief has these fields:");                                   
    lines.push("- id: 01, 02, or 03");                         
    lines.push("- briefType: content, media, or pr");                             
    lines.push("- type: short label in caps");                                    
    lines.push("- platform: where it runs");                   
    lines.push("- urgency: timing in caps");                                      
    lines.push("- title: punchy specific title");                                 
    lines.push("- rows: array of 4-6 objects with k, v, optional hl");
    lines.push("- why: 1-2 sentences");                                           
    lines.push("");                                                               
    lines.push("Rules:");                              
    lines.push("- The Hook or Angle row must have hl: true");                     
    lines.push("- Tags under 12 chars (e.g., +340%, OPEN, 72 HR)");               
    lines.push("- Urgency in caps (e.g., RIDE NOW, FRI DROP)");
    lines.push("- Hooks in quotes, real-person voice");                           
    lines.push("- Avoid AI jargon");                                            
    lines.push("");                                                               
    lines.push("Return ONLY valid JSON. No prose. No fences.");                   
    const prompt = lines.join("\n");                                              
                                                                                  
    try {                                                                       
      const apiResp = await fetch("https://api.anthropic.com/v1/messages", {      
        method: "POST",                           
        headers: {                                                                
          "x-api-key": apiKey,                                                  
          "anthropic-version": "2023-06-01",                                      
          "content-type": "application/json",                                     
        },                                                     
        body: JSON.stringify({                                                    
          model: "claude-sonnet-4-6",                                           
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),                                                                       
      });                                                      
      if (!apiResp.ok) {                                                          
        const errText = await apiResp.text();                                   
        return res.status(502).json({ error: "API failed", detail: errText });
      }                                                
      const data = await apiResp.json();                                          
      const content =                             
        data && data.content && data.content[0] && data.content[0].text;          
      if (!content) {                                                           
        return res.status(502).json({ error: "Empty content" });
      }                                                                           
      let cleaned = content.trim();               
      const first = cleaned.indexOf("{");                                         
      const last = cleaned.lastIndexOf("}");                                    
      if (first > -1 && last > first) {                
        cleaned = cleaned.slice(first, last + 1);                                 
      }                                           
      let parsed;                                                                 
      try {                                                                     
        parsed = JSON.parse(cleaned);                          
      } catch (e) {                                                               
        return res.status(502).json({ error: "Parse failed", raw: content });
      }                                                                           
      return res.status(200).json(parsed);                                      
    } catch (err) {                                                               
      return res.status(500).json({                            
        error: "Server error",                                                    
        detail: String((err && err.message) || err),                            
      });                                       
    }                                                  
  } 
