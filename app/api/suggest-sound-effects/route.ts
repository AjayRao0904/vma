import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import OpenAI from 'openai';
import { logger } from '../../lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/suggest-sound-effects
 * Suggest 3 sound effects for each scene based on visual analysis
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sceneIds } = body;

    if (!sceneIds || !Array.isArray(sceneIds) || sceneIds.length === 0) {
      return NextResponse.json({ error: 'Scene IDs required' }, { status: 400 });
    }

    logger.info('Suggesting sound effects for scenes', { sceneIds });

    const sceneSuggestions = [];

    for (const sceneId of sceneIds) {
      // Get scene from database
      const scene = await db.getSceneById(sceneId);
      if (!scene) {
        logger.warn(`Scene not found, skipping`, { sceneId });
        continue;
      }

      // Get scene analysis
      const analyses = await db.getSceneAnalysisBySceneId(sceneId);

      if (!analyses || analyses.length === 0) {
        // No analysis available - provide specific fallback suggestions
        sceneSuggestions.push({
          sceneId: scene.id,
          sceneName: scene.name,
          suggestions: [
            {
              id: `${scene.id}-room-ambience`,
              name: 'Room ambience with subtle air flow',
              description: 'Natural background presence for indoor scenes'
            },
            {
              id: `${scene.id}-soft-music`,
              name: 'Soft background music playing faintly',
              description: 'Adds emotional depth to the scene'
            },
            {
              id: `${scene.id}-outdoor-birds`,
              name: 'Birds chirping in distance',
              description: 'Creates natural outdoor atmosphere'
            }
          ]
        });
        continue;
      }

      // Collect all raw VLM analysis text
      const rawAnalysisTexts = analyses.map(a => a.raw_analysis).filter(Boolean);
      const combinedAnalysis = rawAnalysisTexts.join(' ');

      logger.info('Scene sound effect generation', {
        sceneName: scene.name,
        totalFrames: analyses.length,
        framesWithAnalysis: rawAnalysisTexts.length,
        combinedAnalysisLength: combinedAnalysis.length,
        analysisText: combinedAnalysis
      });

      if (combinedAnalysis.length === 0) {
        logger.warn('No raw VLM analysis found for scene', {
          sceneName: scene.name,
          sceneId
        });
      }

      // Use OpenAI to generate contextual sound effect suggestions
      const suggestions = await generateAISoundEffects(
        combinedAnalysis,
        scene.id,
        scene.name
      );

      sceneSuggestions.push({
        sceneId: scene.id,
        sceneName: scene.name,
        suggestions
      });
    }

    return NextResponse.json({
      success: true,
      scenes: sceneSuggestions
    });

  } catch (error) {
    logger.error('Error suggesting sound effects', error);
    return NextResponse.json(
      { error: 'Failed to suggest sound effects', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to get most common value
function getMostCommon(arr: string[]): string {
  if (arr.length === 0) return 'unknown';

  const counts: { [key: string]: number } = {};
  arr.forEach(item => {
    const normalized = item.toLowerCase();
    counts[normalized] = (counts[normalized] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0][0];
}

// Use OpenAI to generate contextual sound effects based on VLM analysis
async function generateAISoundEffects(
  analysisText: string,
  sceneId: string,
  sceneName: string
): Promise<Array<{ id: string; name: string; description: string }>> {
  try {
    const prompt = `Based on this visual scene analysis, suggest exactly 3 SPECIFIC, FULLY-FORMED sound effects that match what's actually happening in the scene.

Scene Analysis:
${analysisText}

IMPORTANT RULES:
1. The "name" must be a COMPLETE, DESCRIPTIVE phrase of what the sound IS (not a category)
2. Be SPECIFIC to the actual content - if someone is running, say "Man running on pavement" not "Footsteps"
3. Use actual objects/actions from the scene - if there are waves, say "Ocean waves crashing" not "Water sounds"
4. The description should explain WHY this specific sound fits

GOOD EXAMPLES:
- "Man running on pavement" (not "Footsteps")
- "Ocean waves crashing on shore" (not "Water sounds")
- "Car engine revving and accelerating" (not "Vehicle sounds")
- "Door creaking open slowly" (not "Door sound")
- "Heavy rain falling on roof" (not "Rain ambience")
- "Crowd cheering and applauding" (not "Crowd noise")

BAD EXAMPLES (DO NOT USE):
- "Ambient Background"
- "Scene Atmosphere"
- "Transition Effect"
- "Environmental sounds"
- Generic categories

Return ONLY a valid JSON array with exactly 3 sound effects in this format:
[
  {
    "name": "Specific sound happening (e.g., Woman laughing loudly)",
    "description": "Why this sound fits the scene"
  }
]`;

    logger.info('Sending request to OpenAI for sound effects', {
      sceneName,
      analysisPreview: analysisText.substring(0, 300),
      analysisLength: analysisText.length
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional sound designer for films. Suggest specific, contextual sound effects based on visual scene descriptions. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const responseText = completion.choices[0]?.message?.content || '[]';

    logger.info('OpenAI response received', {
      sceneName,
      rawResponse: responseText
    });

    // Parse the JSON response - handle markdown code blocks
    let cleanedResponse = responseText.trim();

    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    logger.info('Cleaned OpenAI response', {
      sceneName,
      cleanedResponse
    });

    const parsedEffects = JSON.parse(cleanedResponse);

    // Convert to our format with IDs
    const suggestions = parsedEffects.slice(0, 3).map((effect: any, index: number) => ({
      id: `${sceneId}-${index}`,
      name: effect.name || 'Sound Effect',
      description: effect.description || 'Enhances the scene atmosphere'
    }));

    logger.info('Generated AI sound effects', {
      sceneName,
      count: suggestions.length,
      names: suggestions.map((s: any) => s.name)
    });

    return suggestions;

  } catch (error) {
    logger.error('Error generating AI sound effects', error, {
      sceneName,
      sceneId
    });

    // Fallback to specific suggestions if OpenAI fails
    return [
      {
        id: `${sceneId}-room-tone`,
        name: 'Subtle room tone with air movement',
        description: 'Natural environmental ambience for the space'
      },
      {
        id: `${sceneId}-soft-wind`,
        name: 'Gentle wind blowing softly',
        description: 'Adds atmospheric depth to outdoor scenes'
      },
      {
        id: `${sceneId}-distant-traffic`,
        name: 'Distant city traffic humming',
        description: 'Background urban soundscape'
      }
    ];
  }
}
