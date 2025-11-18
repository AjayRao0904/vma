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
    let { projectId, scriptContent, scriptS3Key, scriptFileName } = body;

    if (!projectId || !scriptContent) {
      return NextResponse.json({ error: 'Project ID and script content required' }, { status: 400 });
    }

    // Remove null bytes and other invalid characters that PostgreSQL can't handle
    scriptContent = scriptContent.replace(/\0/g, '').trim();

    logger.info('Analyzing script', {
      projectId,
      scriptLength: scriptContent.length,
      hasS3File: !!scriptS3Key
    });

    // Use OpenAI to analyze the script
    const analysis = await analyzeScriptWithAI(scriptContent);

    // Store the script and analysis in the database
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });

    await pool.query(
      `UPDATE projects
       SET script_content = $1, script_analysis = $2, script_file_path = $3, script_file_name = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [scriptContent, JSON.stringify(analysis), scriptS3Key || null, scriptFileName || null, projectId]
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
    const prompt = `Analyze this screenplay/script and extract structured information with a focus on musical direction.

Script:
${scriptContent}

Please analyze this script and provide:
1. Overall story summary
2. Key themes and mood
3. **Musical direction for the entire project** - This is critical for maintaining consistent audio flavor across all scenes
4. Scene breakdown with individual music suggestions

Return ONLY valid JSON in this format:
{
  "summary": "Brief story summary",
  "themes": ["theme1", "theme2"],
  "overallMood": "overall emotional tone",
  "musicalDirection": {
    "genre": "The primary musical genre (thriller, drama, romance, action, comedy, etc.)",
    "instrumentation": "Recommended instruments and sounds (orchestral, synth, ambient, acoustic, etc.)",
    "tempo": "Overall pacing (slow/meditative, moderate, fast/intense)",
    "emotionalArcs": "Key emotional journey (e.g., 'starts tense, builds to hopeful climax, resolves peacefully')",
    "musicalThemes": "Recurring motifs or musical ideas that should thread through all scenes",
    "tonalPalette": "Harmonic qualities (dark/minor, bright/major, dissonant, harmonious, etc.)",
    "dynamicRange": "Energy levels throughout (quiet introspection to explosive crescendos)",
    "culturalInfluences": "Any specific cultural or period music styles relevant to the story"
  },
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
      "musicMood": "suggested music mood for this specific scene (should complement overall musical direction)",
      "suggestedSoundEffects": ["sound effect 1", "sound effect 2"]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional film composer and music supervisor with expertise in script analysis. Your role is to extract deep musical direction from scripts that will guide music generation across the entire project. Think like Hans Zimmer or John Williams - identify the emotional core, thematic elements, and musical palette that will make the story resonate. Always return valid JSON.'
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
