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

    const plantIdApiKey = Deno.env.get('PLANTID_API_KEY');
    if (!plantIdApiKey) {
      console.error('PLANTID_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling PlantID API...');
    
    const response = await fetch('https://api.plant.id/v2/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': plantIdApiKey,
      },
      body: JSON.stringify({
        images: [imageBase64],
        modifiers: ['crops_fast', 'similar_images'],
        plant_language: 'en',
        plant_details: [
          'common_names',
          'taxonomy',
          'url',
          'description',
          'watering'
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PlantID API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to identify plant' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('PlantID API response received');

    // Extract the most probable plant suggestion
    const suggestions = data.suggestions || [];
    const topSuggestion = suggestions[0];

    if (!topSuggestion) {
      return new Response(
        JSON.stringify({ error: 'No plant identified' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const plantDetails = topSuggestion.plant_details || {};
    const commonNames = plantDetails.common_names || [];
    const scientificName = topSuggestion.plant_name || 'Unknown';
    const description = plantDetails.description?.value || 'No description available';
    const watering = plantDetails.watering?.max || 7;

    const result = {
      commonName: commonNames[0] || scientificName,
      scientificName,
      description,
      wateringFrequencyDays: watering,
      probability: topSuggestion.probability || 0,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in identify-plant function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
