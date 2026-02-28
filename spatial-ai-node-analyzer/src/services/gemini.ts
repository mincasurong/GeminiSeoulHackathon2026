import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are an advanced Spatial AI and Visual-Language VLA subsystem. Your task is to process images representing a 360-degree view of a single localized environment (a "Node") and extract a structured topological understanding of this space.`;

const PROMPT = `Analyze the provided images and output a strictly formatted JSON object. 
The provided images are ordered sequentially from index 0 to N-1.

Extraction Rules:
1. "node_name": Assign a logical, descriptive name to this location based on the visual context (e.g., "Main Kitchen Area", "Living Room Center").
2. "static_anchors": Identify large, immovable architectural features or heavy furniture that define the geometry of the room. Include a brief description and the array of image indices (0-based) where it is visible.
3. "dynamic_objects": Identify movable objects of interest. Include a brief description and the array of image indices (0-based) where it is visible.
4. "navigable_edges": Identify clear pathways leading out of this immediate area to other potential nodes.`;

export interface SpatialNode {
  node_name: string;
  static_anchors: { anchor_id: string; type: string; description: string; image_indices: number[] }[];
  dynamic_objects: { object_id: string; type: string; description: string; image_indices: number[] }[];
  navigable_edges: { edge_id: string; description: string; visual_cue: string }[];
}

export interface ObjectLocation {
  object_id: string;
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export async function generateBirdsEyeView(base64Images: { mimeType: string; data: string }[], topology: SpatialNode): Promise<string> {
  const parts: any[] = base64Images.map(img => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.data
    }
  }));

  const promptText = `STRICT INSTRUCTION: Generate a strict 2D top-down bird's-eye view floor plan blueprint of this room. 
  Perspective MUST be exactly 90 degrees straight down. No 3D walls, no angled views, no perspective distortion. 
  It must look like a professional architectural floor plan.
  
  Room/Node Name: ${topology.node_name}. 
  Structural anchors to include: ${topology.static_anchors.map(a => a.type).join(', ')}. 
  Specific dynamic objects to include: ${topology.dynamic_objects.map(a => a.type).join(', ')}.
  
  CRITICAL: Do not include any text labels, words, or numbers. Just the visual layout of the space.`;

  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      }
    }
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) throw new Error("No image generated");
  
  for (const part of candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image found in response");
}

export async function locateObjectsInMap(mapImageBase64: string, topology: SpatialNode): Promise<ObjectLocation[]> {
  const objectsToLocate = [
    ...topology.static_anchors.map(a => ({ id: a.anchor_id, type: a.type })),
    ...topology.dynamic_objects.map(d => ({ id: d.object_id, type: d.type }))
  ];

  if (objectsToLocate.length === 0) return [];

  const promptText = `Analyze this floor plan image. Locate the following objects and provide their bounding boxes.
Objects to locate:
${objectsToLocate.map(o => `- ${o.id} (${o.type})`).join('\n')}

Return the bounding boxes with coordinates as percentages (0 to 100) of the image width and height. Ensure ymin < ymax and xmin < xmax.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/png", data: mapImageBase64.split(',')[1] } },
        { text: promptText }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            object_id: { type: Type.STRING },
            ymin: { type: Type.NUMBER, description: "0-100" },
            xmin: { type: Type.NUMBER, description: "0-100" },
            ymax: { type: Type.NUMBER, description: "0-100" },
            xmax: { type: Type.NUMBER, description: "0-100" }
          },
          required: ["object_id", "ymin", "xmin", "ymax", "xmax"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];
  return JSON.parse(text) as ObjectLocation[];
}

export async function chatWithEnvironment(query: string, topology: SpatialNode, history: {role: 'user' | 'model', text: string}[]): Promise<string> {
  const systemInstruction = `You are an AI assistant embedded in a spatial mapping system. 
You have access to the following topological data about the current environment:
${JSON.stringify(topology, null, 2)}

Answer the user's questions about this environment based ONLY on the provided topological data. 
Be concise, helpful, and spatial-aware. If the user asks where something is, describe its location based on the static anchors and navigable edges.`;

  const contents = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));
  contents.push({ role: 'user', parts: [{ text: query }] });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: contents,
    config: { systemInstruction }
  });

  return response.text || "No response.";
}

export async function analyzeImages(base64Images: { mimeType: string; data: string }[]): Promise<SpatialNode> {
  const parts = base64Images.map(img => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.data
    }
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [...parts, { text: PROMPT }]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          node_name: { type: Type.STRING },
          static_anchors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                anchor_id: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                image_indices: { type: Type.ARRAY, items: { type: Type.INTEGER } }
              },
              required: ["anchor_id", "type", "description", "image_indices"]
            }
          },
          dynamic_objects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                object_id: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                image_indices: { type: Type.ARRAY, items: { type: Type.INTEGER } }
              },
              required: ["object_id", "type", "description", "image_indices"]
            }
          },
          navigable_edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                edge_id: { type: Type.STRING },
                description: { type: Type.STRING },
                visual_cue: { type: Type.STRING }
              },
              required: ["edge_id", "description", "visual_cue"]
            }
          }
        },
        required: ["node_name", "static_anchors", "dynamic_objects", "navigable_edges"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from model");
  return JSON.parse(text) as SpatialNode;
}
