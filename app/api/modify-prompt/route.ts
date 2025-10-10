import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { logger } from '../../lib/logger';

const SYSTEM_PROMPT = `You are a music prompt specialist. Your job is to take an existing music prompt and modify it based on user requests.

Rules:
1. Keep the core musical style and mood unless explicitly asked to change it
2. Add, modify, or remove any musical elements mentioned (instruments, tempo, mood, intensity, key, etc.)
3. Maintain professional music terminology
4. Return ONLY the modified prompt, nothing else
5. Keep prompts concise but descriptive (20-50 words)
6. Handle ANY instrument: guitar, bass, drums, piano, strings, synth, saxophone, flute, violin, cello, trumpet, etc.
7. Handle mood changes: happier, sadder, darker, brighter, more intense, calmer, dramatic, peaceful, etc.
8. Handle tempo changes: faster, slower, specific BPM, upbeat, slow-paced, energetic, etc.

Examples:
Input: "epic orchestral, powerful brass, 120 BPM, C minor" + "add drums"
Output: "epic orchestral with driving percussion, powerful brass, energetic drums, 120 BPM, C minor"

Input: "serene piano, soft strings, 70 BPM" + "make it faster"
Output: "upbeat piano, bright strings, lively tempo, 110 BPM"

Input: "dark atmospheric, low drones, 80 BPM" + "add guitar"
Output: "dark atmospheric with electric guitar, low drones, moody guitar riffs, 80 BPM"

Input: "cinematic orchestral, strings, 100 BPM" + "add bass and make it darker"
Output: "dark cinematic orchestral, deep bass, brooding strings, ominous atmosphere, 100 BPM, D minor"

Input: "upbeat electronic, synth, 130 BPM" + "add saxophone"
Output: "upbeat electronic with smooth saxophone, funky synth, jazzy sax melody, 130 BPM"

Input: "gentle acoustic, guitar, 80 BPM" + "remove guitar and add piano"
Output: "gentle acoustic, soft piano, warm piano melody, 80 BPM"

Input: "rock instrumental, electric guitar, drums" + "make it sadder"
Output: "melancholic rock ballad, somber electric guitar, gentle drums, emotional atmosphere"`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalPrompt, modification, sceneId } = body;

    if (!modification) {
      return NextResponse.json({ error: 'Modification request required' }, { status: 400 });
    }

    let basePrompt = originalPrompt;

    // If no original prompt provided, try to get the last generated music prompt for this scene
    if (!basePrompt && sceneId) {
      const audioVariations = await db.getAudioVariationsBySceneId(sceneId);
      if (audioVariations.length > 0) {
        // Get the most recent variation with a prompt
        const lastVariation = audioVariations
          .filter(v => v.prompt)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        if (lastVariation?.prompt) {
          basePrompt = lastVariation.prompt;
        }
      }
    }

    // Fallback to generic prompt
    if (!basePrompt) {
      basePrompt = 'cinematic instrumental';
    }

    logger.info('Modifying prompt', { basePrompt, modification });

    // Use OpenAI to intelligently modify the prompt
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
    });

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(`Original prompt: "${basePrompt}"\n\nUser request: "${modification}"\n\nModified prompt:`),
    ];

    const response = await model.invoke(messages);
    let modifiedPrompt = (response.content as string).trim();

    // Remove surrounding quotes if present
    if ((modifiedPrompt.startsWith('"') && modifiedPrompt.endsWith('"')) ||
        (modifiedPrompt.startsWith("'") && modifiedPrompt.endsWith("'"))) {
      modifiedPrompt = modifiedPrompt.slice(1, -1);
    }

    logger.info('Modified prompt', { modifiedPrompt });

    return NextResponse.json({
      success: true,
      originalPrompt: basePrompt,
      modifiedPrompt,
      modification
    });

  } catch (error) {
    logger.error('Error modifying prompt', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: 'Failed to modify prompt', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
