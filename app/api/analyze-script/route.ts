import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import OpenAI from 'openai';
import { logger } from '../../lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/analyze-script
 * Analyze a script file to extract scene information, dialogue, and context
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, scriptContent } = body;

    if (!projectId || !scriptContent) {
      return NextResponse.json({ error: 'Project ID and script content required' }, { status: 400 });
    }

    logger.info('Analyzing script', {
      projectId,
      scriptLength: scriptContent.length
    });

    // Use OpenAI to analyze the script
    const analysis = await analyzeScriptWithAI(scriptContent);

    // Store the script and analysis in the database
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    await pool.query(
      `UPDATE projects
       SET script_content = $1, script_analysis = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [scriptContent, JSON.stringify(analysis), projectId]
    );

    await pool.end();

    logger.info('Script analysis complete', {
      projectId,
      scenesFound: analysis.scenes?.length || 0
    });

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    logger.error('Error analyzing script', error);
    return NextResponse.json(
      { error: 'Failed to analyze script', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function analyzeScriptWithAI(scriptContent: string) {
  try {
    const prompt = `Analyze this screenplay/script and extract structured information.

Script:
${scriptContent}

Please analyze this script and provide:
1. Overall story summary
2. Key themes and mood
3. Scene breakdown with:
   - Scene description
   - Setting (location, time of day, interior/exterior)
   - Characters present
   - Key dialogue or action
   - Emotional tone
   - Suggested music mood
   - Suggested sound effects

Return ONLY valid JSON in this format:
{
  "summary": "Brief story summary",
  "themes": ["theme1", "theme2"],
  "overallMood": "overall emotional tone",
  "scenes": [
    {
      "sceneNumber": 1,
      "description": "Brief scene description",
      "setting": {
        "location": "location name",
        "timeOfDay": "morning/afternoon/evening/night",
        "type": "INT/EXT"
      },
      "characters": ["character names"],
      "keyDialogue": "Notable dialogue or action",
      "emotionalTone": "tone of this scene",
      "musicMood": "suggested music mood",
      "suggestedSoundEffects": ["sound effect 1", "sound effect 2"]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional script supervisor and sound designer. Analyze scripts to extract detailed scene information for audio production. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const responseText = completion.choices[0]?.message?.content || '{}';

    // Clean markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const analysis = JSON.parse(cleanedResponse);

    logger.info('Script analysis successful', {
      scenesFound: analysis.scenes?.length || 0,
      themes: analysis.themes
    });

    return analysis;

  } catch (error) {
    logger.error('Error in AI script analysis', error);

    // Return basic structure if OpenAI fails
    return {
      summary: 'Unable to analyze script',
      themes: [],
      overallMood: 'unknown',
      scenes: []
    };
  }
}
