import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { processMusicRequest } from '../../lib/musicGenerationGraph';
import { logger } from '../../lib/logger';

// System prompt for the music director assistant
const SYSTEM_PROMPT = `You are a music generation assistant. When users request music generation using the format "generate / [scene_number] - [modification]", you should respond ONLY with:

"[Generating music...]"

Do NOT:
- Ask follow-up questions
- Request more details
- Provide explanations
- Say anything after generation

The system will automatically handle the music generation and notify the user when it's complete.

For any other conversation, be helpful and concise.`;

/**
 * Detect user intent and extract actionable commands
 */
async function detectIntent(
  message: string,
  projectId: string | undefined,
  userId: string
): Promise<{ action: string; data: any } | null> {
  const lowerMessage = message.toLowerCase().trim();

  // Detect "generate music" intent with template format: "generate / 1 - add guitar"
  const templateMatch = message.match(/generate\s*\/\s*(\d+)\s*-\s*(.+)/i);

  if (templateMatch) {
    // Template format detected: generate / scene_number - natural language
    const sceneNumber = parseInt(templateMatch[1], 10);
    const userRequest = templateMatch[2].trim();

    logger.info('Template format detected', { sceneNumber, userRequest });

    let sceneId: string | undefined;

    if (projectId) {
      const scenes = await db.getScenesByProjectId(projectId);
      if (scenes.length >= sceneNumber && sceneNumber > 0) {
        sceneId = scenes[sceneNumber - 1].id;
        logger.info('Mapped scene number to ID', { sceneNumber, sceneId });
      }
    }

    if (!sceneId) {
      return null; // Let chatbot respond naturally if scene not found
    }

    // Get the last prompt for this scene
    let basePrompt = '';
    const audioVariations = await db.getAudioVariationsBySceneId(sceneId);
    if (audioVariations.length > 0) {
      const lastVariation = audioVariations
        .filter(v => v.prompt)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (lastVariation?.prompt) {
        basePrompt = lastVariation.prompt;
      }
    }

    // If no base prompt, use a generic one
    if (!basePrompt) {
      basePrompt = 'cinematic instrumental';
    }

    logger.info('Base prompt and user request', { basePrompt, userRequest });

    // Use OpenAI to intelligently combine base prompt + user request
    try {
      const modifyResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/modify-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt: basePrompt,
          modification: userRequest
        })
      });

      let finalPrompt: string;
      if (modifyResponse.ok) {
        const modifyData = await modifyResponse.json();
        finalPrompt = modifyData.modifiedPrompt;
        logger.info('AI-modified prompt', { finalPrompt });
      } else {
        // Fallback: use base prompt as-is since modification failed
        const errorText = await modifyResponse.text();
        logger.warn('Modify-prompt API failed', { status: modifyResponse.status, errorText });
        finalPrompt = basePrompt; // Use original prompt without modification
        logger.info('Fallback to base prompt', { finalPrompt });
      }

      return {
        action: 'generate-music',
        data: { sceneId, prompt: finalPrompt }
      };
    } catch (error) {
      logger.error('Error in template format processing', error instanceof Error ? error : new Error('Unknown error'));
      return null;
    }
  }

  // Detect "sound effects" intent
  if (
    lowerMessage.includes('sound effect') ||
    lowerMessage.includes('sound fx') ||
    lowerMessage.includes('sfx') ||
    lowerMessage.includes('audio effect') ||
    (lowerMessage.includes('suggest') && lowerMessage.includes('sound'))
  ) {
    return {
      action: 'generate-sound-effects',
      data: {}
    };
  }

  // Detect "analyze scene" intent
  if (
    lowerMessage.includes('analyze scene') ||
    lowerMessage.includes('analyse scene') ||
    lowerMessage.includes('analyze the scene') ||
    lowerMessage.includes('what is in scene')
  ) {
    const sceneMatch = lowerMessage.match(/scene\s+(\d+|one|two|three|first|second|third)/i);
    let sceneId: string | undefined;

    if (sceneMatch && projectId) {
      const scenes = await db.getScenesByProjectId(projectId);
      if (scenes.length > 0) {
        const sceneNumberMap: Record<string, number> = {
          'one': 1, 'first': 1,
          'two': 2, 'second': 2,
          'three': 3, 'third': 3,
        };

        const sceneNumber = sceneNumberMap[sceneMatch[1].toLowerCase()] || parseInt(sceneMatch[1], 10);
        if (sceneNumber && scenes[sceneNumber - 1]) {
          sceneId = scenes[sceneNumber - 1].id;
        }
      }
    }

    return {
      action: 'analyze-scene',
      data: { sceneId }
    };
  }

  return null;
}

/**
 * Extract music characteristics from user message
 */
function extractMusicPrompt(message: string): string {
  const lowerMessage = message.toLowerCase();
  const characteristics: string[] = [];

  // Mood detection
  const moods = ['happy', 'sad', 'tense', 'dramatic', 'calm', 'energetic', 'upbeat', 'melancholic', 'epic', 'romantic'];
  for (const mood of moods) {
    if (lowerMessage.includes(mood)) {
      characteristics.push(mood);
    }
  }

  // Genre detection
  const genres = ['orchestral', 'electronic', 'rock', 'jazz', 'ambient', 'cinematic', 'classical'];
  for (const genre of genres) {
    if (lowerMessage.includes(genre)) {
      characteristics.push(genre);
    }
  }

  // Tempo detection
  if (lowerMessage.includes('fast') || lowerMessage.includes('quick')) {
    characteristics.push('fast tempo');
  } else if (lowerMessage.includes('slow')) {
    characteristics.push('slow tempo');
  }

  // Instrument detection
  const instruments = ['piano', 'guitar', 'strings', 'drums', 'bass', 'violin', 'synthesizer'];
  for (const instrument of instruments) {
    if (lowerMessage.includes(instrument)) {
      characteristics.push(instrument);
    }
  }

  if (characteristics.length > 0) {
    return characteristics.join(', ') + ' instrumental';
  }

  return 'cinematic instrumental';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await db.findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { message, projectId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    logger.info('Chat request', { message, projectId, userId: user.id });

    // Get chat history for this project/user
    let chatHistory: any[] = [];
    if (projectId) {
      chatHistory = await db.getChatMessagesByProjectId(projectId);
    } else {
      chatHistory = await db.getChatMessagesByUserId(user.id, 20);
    }

    logger.info('Loaded chat history', { messageCount: chatHistory.length });

    // Detect intents and extract actions from user message FIRST
    const detectedAction = await detectIntent(message, projectId, user.id);

    let assistantMessage: string;

    // If action detected (template format), use fixed response
    if (detectedAction) {
      assistantMessage = "[Generating music...]";
      logger.info('Using fixed response for action', { action: detectedAction.action });
    } else {
      // Only call OpenAI for non-action messages
      const model = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-4o-mini',
        temperature: 0.7,
      });

      const messages = [
        new SystemMessage(SYSTEM_PROMPT),
      ];

      // Add previous messages
      for (const msg of chatHistory) {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else {
          messages.push(new AIMessage(msg.content));
        }
      }

      // Add current user message
      messages.push(new HumanMessage(message));

      logger.info('Sending to OpenAI', { messageCount: messages.length });

      const response = await model.invoke(messages);
      assistantMessage = response.content as string;

      logger.info('Received response from OpenAI');
    }

    // Save user message to database
    await db.createChatMessage({
      project_id: projectId,
      user_id: user.id,
      role: 'user',
      content: message,
    });

    // Save assistant message to database
    await db.createChatMessage({
      project_id: projectId,
      user_id: user.id,
      role: 'assistant',
      content: assistantMessage,
    });

    logger.info('Saved messages to database');

    const responseData: any = {
      message: assistantMessage,
      success: true,
    };

    // Include action if detected
    if (detectedAction) {
      responseData.action = detectedAction.action;
      responseData.actionData = detectedAction.data;
      logger.info('Action detected and will be sent to frontend', { action: detectedAction.action, actionData: detectedAction.data });
    } else {
      logger.info('No action detected, sending normal response');
    }

    return NextResponse.json(responseData);

  } catch (error) {
    logger.error('Chat API error', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve chat history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('projectId');

    let messages;
    if (projectId) {
      messages = await db.getChatMessagesByProjectId(projectId);
    } else {
      messages = await db.getChatMessagesByUserId(user.id);
    }

    return NextResponse.json({
      messages,
      success: true,
    });

  } catch (error) {
    logger.error('Chat history API error', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
