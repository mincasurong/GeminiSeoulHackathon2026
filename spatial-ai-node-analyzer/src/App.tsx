import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Map as MapIcon, Box, Image as ImageIcon, Loader2, Layers, Crosshair, MessageSquare, Send, Network, Cuboid } from 'lucide-react';
import { analyzeImages, generateBirdsEyeView, locateObjectsInMap, chatWithEnvironment, SpatialNode, ObjectLocation } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import SemanticGraph from './components/SemanticGraph';
import DigitalTwin from './components/DigitalTwin';

type ProcessState = {
  step: 'IDLE' | 'ANALYZING' | 'GENERATING' | 'LOCATING' | 'COMPLETE';
  progress: number;
  message: string;
  logs: string[];
};

export default function App() {
  const [images, setImages] = useState<{ file: File; preview: string; base64: string; mimeType: string }[]>([]);
  const [processState, setProcessState] = useState<ProcessState>({ step: 'IDLE', progress: 0, message: '', logs: [] });
  const [result, setResult] = useState<SpatialNode | null>(null);
  const [birdsEyeImage, setBirdsEyeImage] = useState<string | null>(null);
  const [objectLocations, setObjectLocations] = useState<ObjectLocation[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'MAP' | 'GRAPH' | 'TWIN'>('MAP');
  const [error, setError] = useState<string | null>(null);
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatting]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [processState.logs]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (images.length + newFiles.length > 8) {
        setError("Maximum 8 images allowed per node.");
        return;
      }
      
      const processedFiles = await Promise.all(newFiles.map(async (file) => {
        const preview = URL.createObjectURL(file);
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        return { file, preview, base64: base64Data, mimeType: file.type };
      }));
      
      setImages(prev => [...prev, ...processedFiles]);
      setError(null);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      setError("Please upload at least one image.");
      return;
    }
    
    setError(null);
    setResult(null);
    setBirdsEyeImage(null);
    setObjectLocations([]);
    setSelectedObjectId(null);
    setChatHistory([]);
    
    const addLog = (msg: string) => {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
      setProcessState(prev => ({ ...prev, logs: [...prev.logs, `[${timestamp}] ${msg}`] }));
    };

    try {
      setProcessState({ step: 'ANALYZING', progress: 5, message: 'Initializing...', logs: [] });
      const data = images.map(img => ({ mimeType: img.mimeType, data: img.base64 }));
      
      // Step 1: Topology
      setProcessState(prev => ({ ...prev, step: 'ANALYZING', progress: 15, message: 'Extracting spatial topology & objects...' }));
      addLog('Initializing Gemini 3.1 Pro vision analysis...');
      addLog(`Processing ${data.length} image nodes...`);
      const analysisResult = await analyzeImages(data);
      addLog(`Topology extracted: ${analysisResult.node_name}`);
      addLog(`Found ${analysisResult.static_anchors.length} anchors and ${analysisResult.dynamic_objects.length} dynamic objects.`);
      setResult(analysisResult);
      
      // Step 2: Map Generation
      setProcessState(prev => ({ ...prev, step: 'GENERATING', progress: 50, message: 'Generating interior bird\'s-eye map (Nano Banana)...' }));
      addLog('Initializing Gemini 2.5 Flash Image (Nano Banana)...');
      addLog('Applying strict 2D top-down architectural constraints...');
      const imageResult = await generateBirdsEyeView(data, analysisResult);
      addLog('Bird\'s-eye view map generated successfully.');
      setBirdsEyeImage(imageResult);
      
      // Step 3: Localization
      setProcessState(prev => ({ ...prev, step: 'LOCATING', progress: 80, message: 'Mapping object coordinates to floor plan...' }));
      addLog('Calculating bounding boxes for detected entities...');
      const locations = await locateObjectsInMap(imageResult, analysisResult);
      addLog(`Mapped ${locations.length} entities to spatial coordinates.`);
      setObjectLocations(locations);
      
      // Complete
      setProcessState(prev => ({ ...prev, step: 'COMPLETE', progress: 100, message: 'Spatial mapping complete.' }));
      addLog('System ready for interaction.');
    } catch (err: any) {
      console.error("Pipeline Error:", err);
      let errorMessage = "Failed to process environment. Please try again.";
      
      if (err.message && err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED") || err.message.includes("quota")) {
        errorMessage = "API Quota Exceeded (429). You have reached the rate limit or billing quota for your Gemini API key. Please check your Google AI Studio dashboard or try again later.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProcessState(prev => ({ ...prev, step: 'IDLE', progress: 0, message: '' }));
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !result || isChatting) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);

    try {
      const response = await chatWithEnvironment(userMsg, result, chatHistory);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatHistory(prev => [...prev, { role: 'model', text: "Error: Failed to query the environment." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const isProcessing = processState.step !== 'IDLE' && processState.step !== 'COMPLETE';

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-7xl mb-8 flex items-center justify-between border-b border-[#333] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#111] border border-[#333] flex items-center justify-center">
            <Layers className="w-6 h-6 text-[#00FF9D]" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold tracking-tight">INTERIOR_MAPPER</h1>
            <p className="text-xs font-mono text-[#888] uppercase tracking-widest">Multimodal Spatial Extraction</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-[#888]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse"></span>
            VLA SUBSYSTEM ONLINE
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input & Object List */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="bg-[#111] border border-[#333] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#888]">Visual Input</h2>
              <span className="text-xs font-mono text-[#555]">{images.length} / 8 NODES</span>
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
                ${images.length >= 8 ? 'border-[#333] opacity-50 cursor-not-allowed' : 'border-[#333] hover:border-[#00FF9D] hover:bg-[#00FF9D]/5'}`}
              onClick={() => images.length < 8 && !isProcessing && fileInputRef.current?.click()}
            >
              <Upload className="w-6 h-6 text-[#555] mb-2" />
              <p className="text-sm font-medium mb-1">Upload 360° Views</p>
              <p className="text-xs text-[#888]">Drag & drop (Max 8)</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                disabled={images.length >= 8 || isProcessing}
              />
            </div>

            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                <AnimatePresence>
                  {images.map((img, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      key={img.preview} 
                      className="relative aspect-square rounded-lg overflow-hidden border border-[#333] group"
                    >
                      <img src={img.preview} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isProcessing}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={images.length === 0 || isProcessing}
              className={`w-full mt-6 py-3 rounded-lg font-mono text-sm font-bold tracking-wider flex items-center justify-center gap-2 transition-all
                ${images.length === 0 || isProcessing 
                  ? 'bg-[#222] text-[#555] cursor-not-allowed' 
                  : 'bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90 shadow-[0_0_20px_rgba(0,255,157,0.2)]'}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  PROCESSING...
                </>
              ) : (
                <>
                  <MapIcon className="w-4 h-4" />
                  GENERATE INTERIOR MAP
                </>
              )}
            </button>
          </section>

          {/* Object List (Visible only when complete) */}
          <AnimatePresence>
            {processState.step === 'COMPLETE' && result && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111] border border-[#333] rounded-xl p-6 flex-1 overflow-y-auto"
              >
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#888] mb-4">Detected Entities</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-mono text-[#555] mb-2">STATIC ANCHORS</h3>
                    <div className="grid gap-2">
                      {result.static_anchors.map((anchor, i) => (
                        <div 
                          key={i} 
                          onClick={() => setSelectedObjectId(anchor.anchor_id)}
                          className={`p-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors border ${selectedObjectId === anchor.anchor_id ? 'bg-[#00FF9D]/10 border-[#00FF9D]/50' : 'bg-[#1A1A1A] border-[#333] hover:border-[#555]'}`}
                        >
                          <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${selectedObjectId === anchor.anchor_id ? 'bg-[#00FF9D]/20 text-[#00FF9D]' : 'bg-[#222] text-[#555]'}`}>
                            <Box className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{anchor.type}</div>
                            <div className="text-[10px] font-mono text-[#888] truncate">{anchor.anchor_id}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-mono text-[#555] mb-2">DYNAMIC OBJECTS</h3>
                    <div className="grid gap-2">
                      {result.dynamic_objects.map((obj, i) => (
                        <div 
                          key={i} 
                          onClick={() => setSelectedObjectId(obj.object_id)}
                          className={`p-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors border ${selectedObjectId === obj.object_id ? 'bg-[#00FF9D]/10 border-[#00FF9D]/50' : 'bg-[#1A1A1A] border-[#333] hover:border-[#555]'}`}
                        >
                          <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${selectedObjectId === obj.object_id ? 'bg-[#00FF9D]/20 text-[#00FF9D]' : 'bg-[#222] text-[#555]'}`}>
                            <Crosshair className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{obj.type}</div>
                            <div className="text-[10px] font-mono text-[#888] truncate">{obj.object_id}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Map & Progress */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Progress Bar Area */}
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#111] border border-[#333] rounded-xl p-8 flex flex-col items-center justify-center min-h-[500px]"
            >
              <div className="w-full max-w-md">
                <div className="flex justify-between text-xs font-mono text-[#00FF9D] mb-3">
                  <span className="animate-pulse">{processState.message}</span>
                  <span>{processState.progress}%</span>
                </div>
                <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden border border-[#333]">
                  <motion.div 
                    className="h-full bg-[#00FF9D]"
                    initial={{ width: 0 }}
                    animate={{ width: `${processState.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="mt-8 grid grid-cols-3 gap-3 text-[10px] font-mono text-center">
                  <div className={`p-3 rounded-lg border transition-colors ${processState.progress >= 15 ? 'border-[#00FF9D] text-[#00FF9D] bg-[#00FF9D]/10' : 'border-[#333] text-[#555]'}`}>
                    1. TOPOLOGY
                  </div>
                  <div className={`p-3 rounded-lg border transition-colors ${processState.progress >= 50 ? 'border-[#00FF9D] text-[#00FF9D] bg-[#00FF9D]/10' : 'border-[#333] text-[#555]'}`}>
                    2. BIRD'S-EYE MAP
                  </div>
                  <div className={`p-3 rounded-lg border transition-colors ${processState.progress >= 80 ? 'border-[#00FF9D] text-[#00FF9D] bg-[#00FF9D]/10' : 'border-[#333] text-[#555]'}`}>
                    3. LOCALIZATION
                  </div>
                </div>

                {/* Detailed Logs Terminal */}
                <div className="mt-6 w-full bg-[#050505] border border-[#333] rounded-lg p-3 h-40 overflow-y-auto font-mono text-[10px] text-[#888] flex flex-col gap-1 text-left">
                  {processState.logs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[#555] shrink-0">{'>'}</span>
                      <span className={log.includes('successfully') || log.includes('ready') ? 'text-[#00FF9D]' : ''}>{log}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Interactive Map Area */}
          {!isProcessing && processState.step === 'COMPLETE' && birdsEyeImage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#111] border border-[#333] rounded-xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#151515]">
                <div className="flex items-center gap-2">
                  {viewMode === 'MAP' && <MapIcon className="w-5 h-5 text-[#00FF9D]" />}
                  {viewMode === 'GRAPH' && <Network className="w-5 h-5 text-[#A020F0]" />}
                  {viewMode === 'TWIN' && <Cuboid className="w-5 h-5 text-[#FF009D]" />}
                  <h2 className="text-sm font-mono font-bold text-white uppercase">
                    {viewMode === 'MAP' && 'Interactive Floor Plan'}
                    {viewMode === 'GRAPH' && 'Semantic Graph'}
                    {viewMode === 'TWIN' && 'Digital Twin 3D'}
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs font-mono text-[#888]">
                    {result?.node_name}
                  </div>
                  <div className="flex bg-[#222] rounded-lg p-1 border border-[#333]">
                    <button 
                      onClick={() => setViewMode('MAP')}
                      className={`px-3 py-1 rounded text-xs font-mono transition-colors ${viewMode === 'MAP' ? 'bg-[#00FF9D] text-black font-bold' : 'text-[#888] hover:text-white'}`}
                    >
                      MAP
                    </button>
                    <button 
                      onClick={() => setViewMode('GRAPH')}
                      className={`px-3 py-1 rounded text-xs font-mono transition-colors ${viewMode === 'GRAPH' ? 'bg-[#A020F0] text-white font-bold' : 'text-[#888] hover:text-white'}`}
                    >
                      GRAPH
                    </button>
                    <button 
                      onClick={() => setViewMode('TWIN')}
                      className={`px-3 py-1 rounded text-xs font-mono transition-colors ${viewMode === 'TWIN' ? 'bg-[#FF009D] text-white font-bold' : 'text-[#888] hover:text-white'}`}
                    >
                      TWIN
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="relative w-full aspect-video bg-black">
                {viewMode === 'MAP' && (
                  <>
                    <img src={birdsEyeImage} alt="Bird's Eye View" className="w-full h-full object-cover" />
                    
                    {objectLocations.map(loc => (
                      <div
                        key={loc.object_id}
                        onClick={() => setSelectedObjectId(loc.object_id === selectedObjectId ? null : loc.object_id)}
                        className={`absolute border-2 cursor-pointer transition-all duration-200 
                          ${selectedObjectId === loc.object_id 
                            ? 'border-[#00FF9D] bg-[#00FF9D]/30 z-10 shadow-[0_0_20px_rgba(0,255,157,0.6)]' 
                            : 'border-white/40 hover:border-white hover:bg-white/20'}`}
                        style={{
                          top: `${Math.max(0, Math.min(100, loc.ymin))}%`,
                          left: `${Math.max(0, Math.min(100, loc.xmin))}%`,
                          width: `${Math.max(1, Math.min(100 - loc.xmin, loc.xmax - loc.xmin))}%`,
                          height: `${Math.max(1, Math.min(100 - loc.ymin, loc.ymax - loc.ymin))}%`
                        }}
                      >
                        <div className={`absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 border border-[#333] text-white text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap transition-opacity
                          ${selectedObjectId === loc.object_id ? 'opacity-100 border-[#00FF9D]' : 'opacity-0 hover:opacity-100'}`}>
                          {loc.object_id}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {viewMode === 'GRAPH' && (
                  <SemanticGraph data={result!} />
                )}

                {viewMode === 'TWIN' && (
                  <DigitalTwin 
                    mapImage={birdsEyeImage} 
                    locations={objectLocations} 
                    topology={result!} 
                    selectedObjectId={selectedObjectId}
                    onSelectObject={setSelectedObjectId}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* Idle State */}
          {processState.step === 'IDLE' && (
            <div className="bg-[#111] border border-[#333] rounded-xl p-8 flex flex-col items-center justify-center min-h-[500px] text-[#555] font-mono text-center">
              <MapIcon className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm mb-2">AWAITING VISUAL INPUT</p>
              <p className="text-xs max-w-sm">Upload 360° environment photos to generate an interactive interior map with localized objects.</p>
            </div>
          )}

          {/* Selected Object Details Panel */}
          <AnimatePresence>
            {selectedObjectId && result && processState.step === 'COMPLETE' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-[#00FF9D]/5 border border-[#00FF9D]/20 rounded-lg p-4 mb-2 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-mono font-bold text-[#00FF9D] uppercase">
                      Selected: {selectedObjectId}
                    </h4>
                    <button onClick={() => setSelectedObjectId(null)} className="text-[#888] hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {(() => {
                    const obj = [...result.static_anchors, ...result.dynamic_objects].find(o => 
                      ('anchor_id' in o ? o.anchor_id : o.object_id) === selectedObjectId
                    );
                    
                    if (!obj) return null;
                    
                    const indices = obj.image_indices || [];
                    const relatedImages = indices.map(idx => images[idx]).filter(Boolean);
                    
                    return (
                      <div>
                        <p className="text-xs text-[#ccc] mb-3">{obj.description}</p>
                        {relatedImages.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2">
                            {relatedImages.map((img, idx) => (
                              <div key={idx} className="relative aspect-square rounded border border-[#333] overflow-hidden">
                                <img src={img.preview} alt="Source" className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[8px] font-mono p-0.5 text-center text-[#00FF9D]">
                                  SOURCE
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-mono text-[#555] italic">No source images mapped.</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Chat Menu */}
          {processState.step === 'COMPLETE' && result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111] border border-[#333] rounded-xl flex flex-col h-80 overflow-hidden mt-2"
            >
              <div className="p-3 border-b border-[#333] bg-[#151515] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00FF9D]" />
                <h3 className="text-xs font-mono font-bold text-white uppercase">Spatial Query Interface</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {chatHistory.length === 0 && (
                  <div className="text-xs font-mono text-[#555] text-center my-auto flex flex-col items-center gap-2">
                    <MessageSquare className="w-8 h-8 opacity-20" />
                    <p>Ask questions about the extracted environment...</p>
                    <p className="text-[10px]">E.g., "Where is the microwave located?"</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg text-sm font-mono leading-relaxed ${msg.role === 'user' ? 'bg-[#00FF9D]/10 text-[#00FF9D] border border-[#00FF9D]/30' : 'bg-[#222] text-[#ccc] border border-[#333]'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex justify-start">
                    <div className="bg-[#222] border border-[#333] p-3 rounded-lg flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-[#888]" />
                      <span className="text-xs font-mono text-[#888]">Querying VLA...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleChatSubmit} className="p-3 border-t border-[#333] bg-[#151515] flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Query the environment..."
                  className="flex-1 bg-[#050505] border border-[#333] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#00FF9D] transition-colors"
                  disabled={isChatting}
                />
                <button 
                  type="submit" 
                  disabled={isChatting || !chatInput.trim()} 
                  className="bg-[#00FF9D] text-black px-4 py-2 rounded hover:bg-[#00FF9D]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
