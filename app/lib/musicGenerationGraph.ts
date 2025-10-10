import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

// Define the state interface
interface MusicGenerationState {
  userInput: string;
  sceneNumber?: number;
  modification?: string;
  sceneId?: string;
  basePrompt?: string;
  modifiedPrompt?: string;
  action?: {
    type: string;
    data: any;
  };
  response: string;
  error?: string;
}

// Node: Parse user input for template format
function parseInput(state: MusicGenerationState): Partial<MusicGenerationState> {
  const templateMatch = state.userInput.match(/generate\s*\/\s*(\d+)\s*-\s*(.+)/i);

  if (templateMatch) {
    return {
      sceneNumber: parseInt(templateMatch[1], 10),
      modification: templateMatch[2].trim(),
      response: "[Generating music...]"
    };
  }

  // Not a template format - let it pass through to general chat
  return {
    response: ""
  };
}

// Node: Determine if this is a music generation request
function shouldGenerateMusic(state: MusicGenerationState): string {
  if (state.sceneNumber && state.modification) {
    return "generateMusic";
  }
  return "generalChat";
}

// Node: Create music generation action
function createMusicAction(state: MusicGenerationState): Partial<MusicGenerationState> {
  if (!state.sceneId || !state.modifiedPrompt) {
    return {
      error: "Missing required data for music generation"
    };
  }

  return {
    action: {
      type: "generate-music",
      data: {
        sceneId: state.sceneId,
        prompt: state.modifiedPrompt
      }
    },
    response: "[Generating music...]"
  };
}

// Node: Handle general conversation
async function handleGeneralChat(state: MusicGenerationState): Promise<Partial<MusicGenerationState>> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
  });

  const systemPrompt = `You are a helpful music assistant. Be concise and friendly.`;

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(state.userInput)
  ];

  const response = await model.invoke(messages);

  return {
    response: response.content as string
  };
}

// Build the graph
export function buildMusicGenerationGraph() {
  const workflow = new StateGraph<MusicGenerationState>({
    channels: {
      userInput: null,
      sceneNumber: null,
      modification: null,
      sceneId: null,
      basePrompt: null,
      modifiedPrompt: null,
      action: null,
      response: null,
      error: null,
    }
  });

  // Add nodes
  workflow.addNode("parseInput", parseInput);
  workflow.addNode("generateMusic", createMusicAction);
  workflow.addNode("generalChat", handleGeneralChat);

  // Set entry point
  workflow.setEntryPoint("parseInput");

  // Add conditional edges
  workflow.addConditionalEdges(
    "parseInput",
    shouldGenerateMusic,
    {
      generateMusic: "generateMusic",
      generalChat: "generalChat"
    }
  );

  // Add edges to END
  workflow.addEdge("generateMusic", END);
  workflow.addEdge("generalChat", END);

  return workflow.compile();
}

// Helper function to run the graph
export async function processMusicRequest(
  userInput: string,
  sceneId?: string,
  basePrompt?: string,
  modifiedPrompt?: string
): Promise<{ response: string; action?: any; error?: string }> {
  const graph = buildMusicGenerationGraph();

  const initialState: MusicGenerationState = {
    userInput,
    sceneId,
    basePrompt,
    modifiedPrompt,
    response: ""
  };

  const result = await graph.invoke(initialState);

  return {
    response: result.response,
    action: result.action,
    error: result.error
  };
}
