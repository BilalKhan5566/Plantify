import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GOOGLE_GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured', apiError: true }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling Google Gemini for plant identification...');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an expert botanist. Analyze this plant image and provide identification details.

You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "identified": true/false,
  "confidence": 0.0-1.0,
  "commonName": "Common name of the plant",
  "scientificName": "Scientific name (genus species)",
  "about": "1-2 sentence summary about this plant",
  "explanation": "3-4 sentences describing characteristics, origin, and interesting facts",
  "wateringFrequencyDays": number (how often to water in days),
  "sunlight": "Light requirements (e.g., 'Bright indirect light')",
  "soilType": "Preferred soil type",
  "nativeRegion": "Where the plant originates from",
  "careLevel": "Easy/Moderate/Difficult"
}

If you cannot identify the plant or confidence is below 50%, set "identified" to false.`
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.', apiError: true }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key. Please check your Gemini API key.', apiError: true }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to identify plant. Please try again.', apiError: true }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('Gemini response received');

    const content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.error('No content in Gemini response:', aiResponse);
      return new Response(
        JSON.stringify({ error: 'No identification result', lowConfidence: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response
    let plantData;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plantData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse plant data', lowConfidence: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check confidence threshold (50%)
    if (!plantData.identified || plantData.confidence < 0.5) {
      console.log('Low confidence result:', plantData.confidence);
      return new Response(
        JSON.stringify({ 
          error: 'Low confidence identification',
          lowConfidence: true,
          probability: plantData.confidence || 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build additional info array
    const additionalInfo = [
      `Watering: Every ${plantData.wateringFrequencyDays || 7} days`,
      `Sunlight: ${plantData.sunlight || 'Moderate indirect light'}`,
      `Soil: ${plantData.soilType || 'Well-draining potting mix'}`,
      `Native to: ${plantData.nativeRegion || 'Various regions'}`,
      `Care Level: ${plantData.careLevel || 'Moderate'}`
    ];

    const result = {
      commonName: plantData.commonName || 'Unknown Plant',
      scientificName: plantData.scientificName || 'Species unknown',
      about: plantData.about || 'A beautiful plant species.',
      explanation: plantData.explanation || plantData.about || 'No additional details available.',
      additionalInfo,
      wateringFrequencyDays: plantData.wateringFrequencyDays || 7,
      probability: plantData.confidence || 0.8,
    };

    console.log('Plant identified:', result.commonName);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in identify-plant function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', apiError: true }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
