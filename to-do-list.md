# GeminiSpace Gemma 4 Direct Integration: Antigravity Master Plan

## Context for AI Agent (Antigravity)
You are an expert Python backend developer. Your task is to integrate the Gemma 4 multimodal model directly into the "GeminiSpace" web application's backend. The user explicitly wants to bypass any external or local API servers (like LM Studio's server) and load the model weights directly into the application's memory space for processing panoramic photos into spatial graphs and 2D/3D maps.

## Strategy Overview
Since the model was downloaded via LM Studio, the weights are in GGUF format. We will use `llama-cpp-python` with CUDA acceleration to load the model and its vision projector directly into the Python backend. This maximizes performance on the local RTX 2080 Ti (11GB VRAM) and keeps the architecture self-contained.

---

## Milestone 1: Environment & Dependency Setup
*Goal: Prepare the Python environment to run GGUF models directly on the GPU.*
- [ ] **Task 1.1:** Install `llama-cpp-python` with CUDA support enabled. (e.g., `CMAKE_ARGS="-DLLAMA_CUBLAS=on" pip install llama-cpp-python`).
- [ ] **Task 1.2:** Locate the Gemma 4 GGUF file. LM Studio stores these in `~/.cache/lm-studio/models/` (or the custom path set in LM Studio). Map this absolute path in the backend `.env` file as `GEMMA_MODEL_PATH`.
- [ ] **Task 1.3:** Locate or download the corresponding Vision Projector file (`mmproj-model-f16.gguf` or similar) required for Gemma 4's multimodal capabilities in `llama.cpp`. Map this in the `.env` as `GEMMA_MMPROJ_PATH`.

## Milestone 2: Direct Model Initialization
*Goal: Load the weights into the RTX 2080 Ti's VRAM when the backend starts.*
- [ ] **Task 2.1:** Create a `LocalGemmaService` class in the backend.
- [ ] **Task 2.2:** Initialize the `Llama` class from `llama_cpp`. Configure `n_gpu_layers=-1` to offload all layers to the RTX 2080 Ti, and set `n_ctx` to an appropriate context window for your panoramic images and spatial prompts (e.g., 4096 or 8192).
- [ ] **Task 2.3:** Pass the `chat_handler` using `Llava15ChatHandler` (or the specific Gemma multimodal handler available in your `llama-cpp-python` version) pointing to the `GEMMA_MMPROJ_PATH`.

## Milestone 3: Replacing Cloud API with Local Inference
*Goal: Swap the existing Gemini 3.x Flash network calls with local execution.*
- [ ] **Task 3.1:** Locate the routing logic where GeminiSpace currently handles the uploaded panoramic images and spatial prompts.
- [ ] **Task 3.2:** Convert the incoming panoramic images (usually base64 or multipart form data) into the specific input format required by the `llama_cpp` chat handler (often base64 data URIs).
- [ ] **Task 3.3:** Implement the `create_chat_completion` method within `LocalGemmaService`, passing the system prompt, the image data, and the user query.

## Milestone 4: Enforcing Structured Output (Crucial for Spatial Data)
*Goal: Ensure Gemma 4 outputs the strict JSON structures required for GeminiSpace's 2D maps, 3D voxels, and topology graphs.*
- [ ] **Task 4.1:** Since spatial intelligence requires precise parsing, implement a JSON schema definition for the expected topological output.
- [ ] **Task 4.2:** Utilize `llama-cpp-python`'s grammar support or `response_format` parameter to constrain the model's output strictly to the JSON schema, preventing hallucinations or conversational filler that would break the frontend rendering.
- [ ] **Task 4.3:** Add error handling to catch and retry if the local model fails to generate a valid graph.
