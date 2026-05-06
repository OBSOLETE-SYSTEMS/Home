// api/recon.js                                                                            
  // Vercel Serverless Function — calls Claude to generate a recon                           
  // from user inputs, returns structured JSON the storefront UI renders.                    
                                                                                             
  export default async function handler(req, res) {                                          
    if (req.method !== 'POST') {                                                             
      return res.status(405).json({ error: 'Method not allowed' });                          
    }                                                                                    
                                                                                             
    const apiKey = process.env.ANTHROPIC_API_KEY;                                        
    if (!apiKey) {                                                                           
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });            
    }                                                                                        
                                                                                             
    let body = req.body;                                                                     
    if (typeof body === 'string') {                 
      try { body = JSON.parse(body); } catch { body = {}; }                                  
    }                                                                                        
    const {                                            
      category = '',                                                                         
      brand = '',                                                                        
      differentiator = '',                             
      competitors = '',                                                                      
      bottleneck = '',                              
    } = body || {};                                                                          
                                                                                             
    if (!category || !brand || !bottleneck) {          
      return res.status(400).json({ error: 'Missing required fields: category, brand,        
  bottleneck' });                                                                        
    }                                               
                                                                                             
    const prompt = `You are OBSOLETE's recon engine — a strategic creative analyst that turns
   brand inputs into shippable, in-voice creative briefs.                                    
                                                                                         
  You will produce a structured JSON response. NO commentary. NO markdown fences. Just the 
  JSON object.                                         
                                                                                             
  The JSON shape is exactly:                        
                                                                                             
  {                                                                                          
    "intel": {                                                 
      "signal": { "tag": "SHORT_TAG", "text": "ONE sentence on what's emerging in the        
  category." },                                                                          
      "gap": { "tag": "SHORT_TAG", "text": "ONE sentence on what competitors aren't doing."  
  },                                                
      "window": { "tag": "TIMING_TAG", "text": "ONE sentence on urgency or window of         
  opportunity." }                                                                        
    },                                                         
    "briefs": [                                     
      {                                         
        "id": "01",                                                                          
        "briefType": "content",                                
        "type": "BRIEF_LABEL_3_WORDS_MAX",                                                   
        "platform": "Platform · channel detail",                                         
        "urgency": "TIMING_LABEL_IN_CAPS",                                                   
        "title": "Specific punchy title (one line, no surrounding quotes)",
        "rows": [                                                                            
          { "k": "Format", "v": "Description" },                                         
          { "k": "Hook", "v": "Actual hook in the brand's voice (in quotes)", "hl": true },
          { "k": "Visual", "v": "Description" },               
          { "k": "Caption", "v": "Direction" },                                              
          { "k": "Hashtags", "v": "Direction" },                                             
          { "k": "Posting", "v": "When and where" }                                          
        ],                                                                                   
        "why": "1-2 sentences on why this brief works for this brand right now."             
      },                                                                                     
      {                                                                                      
        "id": "02",                                                                          
        "briefType": "pr",                                                                   
        "type": "PR_LABEL",                                                                  
        "platform": "Press tier",                                                            
        "urgency": "WINDOW_TIMING",                                                      
        "title": "Specific PR pitch title",                                                  
        "rows": [                                                                            
          { "k": "Targets", "v": "Named outlets and journalists if possible" },              
          { "k": "Angle", "v": "Actual angle in the brand's voice (in quotes)", "hl": true },
          { "k": "Assets", "v": "What's required" },                                     
          { "k": "Method", "v": "How to send" },               
          { "k": "Window", "v": "Timing" }                                                   
        ],                                             
        "why": "1-2 sentences on why this brief works."                                      
      },                                                                                 
      {                                                                                      
        "id": "03",                                                                          
        "briefType": "media",                                  
        "type": "MEDIA_LABEL",                                                               
        "platform": "Channel · audience",                                                
        "urgency": "LAUNCH_TIMING",                                                          
        "title": "Specific paid media play title",                                       
        "rows": [                                                                            
          { "k": "Objective", "v": "Awareness | Consideration | Conversion" },           
          { "k": "Audience", "v": "Specific targeting" },
          { "k": "Creative", "v": "Direction" },                                             
          { "k": "Budget", "v": "$ amount over time period" }, 
          { "k": "Expected KPI", "v": "Specific metric and bench" }                          
        ],                                                                               
        "why": "1-2 sentences on the leverage."                                              
      }                                                        
    ]                                                                                        
  }                                                                                          
                                                                                             
  CRITICAL RULES:                                                                            
  1. Return ONLY the JSON object. No "Here is your recon:" or markdown fencing.              
  2. Each brief MUST be one of: "content" | "media" | "pr".                                  
  3. Every brief MUST have at least 4 rows.                                                  
  4. The "Hook" or "Angle" row MUST have "hl": true.                                         
  5. Tags must be SHORT (under 12 chars). Examples: "+340%", "3 BEATS", "OPEN", "72 HR", 
  "2-WK".                                                                                    
  6. Urgency must be IMPERATIVE. Examples: "RIDE NOW", "LAUNCH MON", "2-WK WINDOW", "FRI 
  DROP".                                                       
                                                       
  VOICE RULES:                                                                               
  - Write briefs as if a strategist embedded in the brand wrote them. Specific over abstract.
  - "$1,200 over 10 days, front-loaded first 72 hrs" beats "modest budget."                  
  - Hooks and angles must sound like a person said them, not an AI. In quotes.               
  - Avoid AI jargon ("leverage", "synergy", "AI-powered").                                   
                                                                                             
  INPUTS:                                                                                    
  - Category: ${category}                                                                
  - Brand: ${brand}                                                                          
  - Differentiator: ${differentiator || '(not provided — infer from category context)'}  
  - Competitors: ${competitors || '(not provided — use category leaders)'}
  - Bottleneck the brand is stuck on: ${bottleneck}                                          
                                                                                             
  Now generate the recon. Return ONLY the JSON object.`;                                     
                                                                                             
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
        return res.status(502).json({ error: 'Anthropic API call failed', detail: errText });
      }                                                                                  
                                                    
      const data = await apiResp.json();                                                     
      const content = data?.content?.[0]?.text; 
      if (!content) {                                                                        
        return res.status(502).json({ error: 'No content in API response', raw: data }); 
      }                                  
                                                    
      let parsed;                                                                            
      try {                                     
        const cleaned = content                                                              
          .replace(/^```json\s*/i, '')                                                   
          .replace(/^```\s*/i, '')
          .replace(/\s*```\s*$/, '')     
          .trim();                                                                           
        parsed = JSON.parse(cleaned);               
      } catch (e) {                                                                          
        return res.status(502).json({ error: 'Failed to parse model JSON', raw: content });
      }                                                        
                                                    
      if (!parsed?.intel?.signal || !parsed?.intel?.gap || !parsed?.intel?.window) {
        return res.status(502).json({ error: 'Invalid intel shape', parsed });               
      }                                                        
      if (!Array.isArray(parsed.briefs) || parsed.briefs.length < 1) {                       
        return res.status(502).json({ error: 'Invalid briefs shape', parsed });          
      }                                                                                      
                                                    
      return res.status(200).json(parsed);                                                   
    } catch (err) {                                                                          
      return res.status(500).json({ error: 'Server error', detail: String(err?.message ||
  err) });                                                                                   
    }                                                                                    
  }                       
