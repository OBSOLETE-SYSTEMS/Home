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
      try { body = JSON.parse(body); } catch (e) { body = {}; }                   
    }                                                                             
    const {                                            
      category = '',                                                              
      brand = '',                                                               
      differentiator = '',                          
      competitors = '',   
      bottleneck = '',                          
    } = body || {};                                                               
                                                               
    if (!category || !brand || !bottleneck) {                                     
      return res.status(400).json({ error: 'Missing required fields: category,  
  brand, bottleneck' });  
    }                                           
                                                                                  
    const prompt = [                                           
      "You are OBSOLETE's recon engine — a strategic creative analyst that turns  
  brand inputs into shippable, in-voice creative briefs.",                      
      "",                                       
      "Return ONLY a valid JSON object. No commentary. No markdown code fences. 
  The shape is exactly:",                                                         
      "",                                         
      '{',                                                                        
      '  "intel": {',                                                           
      '    "signal": { "tag": "SHORT_TAG", "text": "One sentence on what is 
  emerging in the category." },',                                                 
      '    "gap":    { "tag": "SHORT_TAG", "text": "One sentence on what 
  competitors are not doing." },',                                                
      '    "window": { "tag": "TIMING",    "text": "One sentence on urgency or    
  window of opportunity." }',                          
      '  },',                                                                     
      '  "briefs": [',                                                          
      '    { "id": "01", "briefType": "content", "type": "BRIEF_LABEL", 
  "platform": "Platform - channel", "urgency": "TIMING", "title": "Specific punchy
   title", "rows": [ {"k":"Format","v":"..."}, {"k":"Hook","v":"...","hl":true}, 
  {"k":"Visual","v":"..."}, {"k":"Caption","v":"..."}, {"k":"Hashtags","v":"..."},
   {"k":"Posting","v":"..."} ], "why": "1-2 sentences." },',                    
      '    { "id": "02", "briefType": "pr",      "type": "PR_LABEL",              
  "platform": "Press tier",      "urgency": "WINDOW", "title": "PR pitch title",  
       "rows": [ {"k":"Targets","v":"..."}, {"k":"Angle","v":"...","hl":true}, 
  {"k":"Assets","v":"..."}, {"k":"Method","v":"..."}, {"k":"Window","v":"..."} ], 
  "why": "..." },',                                                               
      '    { "id": "03", "briefType": "media",   "type": "MEDIA_LABEL",           
  "platform": "Channel - audience", "urgency": "LAUNCH", "title": "Paid media     
  play",    "rows": [ {"k":"Objective","v":"..."}, {"k":"Audience","v":"..."},  
  {"k":"Creative","v":"..."}, {"k":"Budget","v":"..."}, {"k":"Expected 
  KPI","v":"..."} ], "why": "..." }',                                             
      '  ]',                                      
      '}',                                                                        
      "",                                                                       
      "CRITICAL RULES:",
      "1. Return ONLY the JSON object. No prose around it. No markdown fences.",  
      "2. Each brief must be one of: content, media, pr.",
      "3. Every brief must have at least 4 rows.",                                
      "4. The Hook or Angle row must have hl: true. Other rows omit hl.",       
      "5. Tags must be SHORT (under 12 chars). Examples: +340%, 3 BEATS, OPEN, 72 
  HR, 2-WK.",                                          
      "6. Urgency must be IMPERATIVE caps. Examples: RIDE NOW, LAUNCH MON, 2-WK 
  WINDOW, FRI DROP.",                                          
      "",                                                      
      "VOICE RULES:",                                                             
      "- Specific over abstract. $1,200 over 10 days, front-loaded first 72 hrs 
  beats modest budget.",                                                          
      "- Hooks and angles must sound like a real person said them, in quotes.",   
      "- Avoid AI jargon: leverage, synergy, AI-powered.",                        
      "",                                                                         
      "INPUTS:",                                                                  
      "Category: " + category,                                                  
      "Brand: " + brand,                                                          
      "Differentiator: " + (differentiator || "(infer from category)"),         
      "Competitors: " + (competitors || "(use category leaders)"),                
      "Bottleneck the brand is stuck on: " + bottleneck,
      "",                                                                         
      "Generate the recon now. Return ONLY the JSON object.",                     
    ].join("\n");                                              
                                                                                  
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
        return res.status(502).json({ error: 'Anthropic API call failed', detail:
  errText });             
      }                                         
                                                                                  
      const data = await apiResp.json();                       
      const content = data && data.content && data.content[0] &&                  
  data.content[0].text;                                                         
      if (!content) {
        return res.status(502).json({ error: 'No content in API response', raw:
  data });                                                                        
      }                                                
                                                                                  
      // Strip any prose or markdown fences by isolating the first { to last }  
      let cleaned = content.trim();                 
      const firstBrace = cleaned.indexOf('{');         
      const lastBrace = cleaned.lastIndexOf('}');              
      if (firstBrace > -1 && lastBrace > firstBrace) {                            
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }                                                                           
                                                                                
      let parsed;                                                                 
      try {                                       
        parsed = JSON.parse(cleaned);                                             
      } catch (e) {                                                               
        return res.status(502).json({ error: 'Failed to parse model JSON', raw:
  content });                                                                     
      }                                                                         
                                                                                  
      if (!parsed || !parsed.intel || !parsed.briefs ||                         
  !Array.isArray(parsed.briefs)) {              
        return res.status(502).json({ error: 'Invalid response shape', parsed });
      }                                                                           
                                                  
      return res.status(200).json(parsed);                                        
    } catch (err) {                                                             
      return res.status(500).json({ error: 'Server error', detail: String((err &&
  err.message) || err) });                                                        
    }                                             
  }   
