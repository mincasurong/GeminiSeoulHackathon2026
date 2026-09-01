"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

// Sample pre-generated localized entities (based on public/topology.json)
const SAMPLE_OBJECTS = [
  { id: "floor_directory", label: "Floor Directory", type: "Wall Sign", ymin: 15, xmin: 10, ymax: 35, xmax: 25, desc: "Building directory on marble wall for floors 1-4" },
  { id: "elevator", label: "Elevator", type: "Architectural", ymin: 10, xmin: 35, ymax: 40, xmax: 65, desc: "Reflective metal sliding double elevator doors" },
  { id: "golden_door", label: "Golden Door", type: "Entrance", ymin: 20, xmin: 75, ymax: 55, xmax: 95, desc: "Golden-framed glass entrance to Vista Restaurant" },
  { id: "reception_desk", label: "Reception Desk", type: "Heavy Furniture", ymin: 60, xmin: 70, ymax: 85, xmax: 95, desc: "Marble reception counter behind golden door" },
  { id: "potted_plant", label: "Potted Plant", type: "Decor", ymin: 50, xmin: 62, ymax: 70, xmax: 72, desc: "Green indoor ficus plant in cylindrical grey pot" },
  { id: "staircase_structure", label: "Staircase", type: "Architectural", ymin: 60, xmin: 10, ymax: 90, xmax: 45, desc: "White metal railing staircase connecting floors 1-4" },
];

const MOCK_QA = [
  { sender: 'user', text: 'Can you show me the overall structure of this floor and key landmarks?' },
  { sender: 'agent', text: 'I have analyzed the 8 panoramic images and extracted the topology. The space is a "Building Elevator Lobby and Stairwell". Key anchors include the central Elevator, the Golden Door leading to Vista Restaurant, and the Main Staircase.' },
  { sender: 'user', text: 'Where is the entrance to the Vista Restaurant, and is there any obstacle?' },
  { sender: 'agent', text: 'The Golden Door is located at the East boundary (bounding box x: 75-95%, y: 20-55%). A potted plant is situated nearby at (x: 62-72%, y: 50-70%). The pathway is clear and navigable.' },
  { sender: 'user', text: 'Can you dispatch a navigation trajectory to the elevator for our AMR robot?' },
  { sender: 'agent', text: 'Trajectory planned: [Start (Lobby Center) -> Elevator Entry (x: 5.0m, y: 2.5m, z: 0.0m)]. Serializing ROS2 Nav2 FollowWaypoints action payload for hardware dispatch.' },
];

export default function ScholarPage() {
  const [qaIndex, setQaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedObjectId, setSelectedObjectId] = useState<string>("elevator");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedObj = SAMPLE_OBJECTS.find(o => o.id === selectedObjectId) || SAMPLE_OBJECTS[0];

  // Automated playback loop
  useEffect(() => {
    if (!isPlaying) return;
    if (qaIndex < MOCK_QA.length) {
      const delay = qaIndex % 2 === 0 ? 2000 : 3500;
      const timer = setTimeout(() => {
        setQaIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [qaIndex, isPlaying]);

  const handleSimulateDispatch = () => {
    const xMeters = (selectedObj.xmin + (selectedObj.xmax - selectedObj.xmin) / 2) * 0.1;
    const yMeters = (selectedObj.ymin + (selectedObj.ymax - selectedObj.ymin) / 2) * 0.1;
    setToastMessage(`Dispatched trajectory to ${selectedObj.label} (x: ${xMeters.toFixed(2)}m, y: ${yMeters.toFixed(2)}m) via ROS2 Nav2`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const calculatedX = ((selectedObj.xmin + (selectedObj.xmax - selectedObj.xmin) / 2) * 0.1).toFixed(2);
  const calculatedY = ((selectedObj.ymin + (selectedObj.ymax - selectedObj.ymin) / 2) * 0.1).toFixed(2);

  return (
    <main className={styles.container}>
      {/* Top Header Navigation */}
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          ← Back to Live Dashboard
        </Link>
        <div className={styles.badgeGroup}>
          <span className={styles.awardBadge}>🏆 1st Place — Gemini in Hard Tech</span>
          <span className={styles.modelBadge}>Powered by Gemini 3.7 Flash</span>
        </div>
      </div>

      {/* Hero Header */}
      <section className={styles.hero}>
        <h1 className={styles.title}>GeminiSpace (SPATIAL_OS)</h1>
        <p className={styles.subtitle}>
          A Vision-Language-Action (VLA) indoor navigation system that turns ordinary room photos into 
          2D orthographic blueprints, 3D voxel twins, and ROS2 robotic navigation trajectories.
        </p>
      </section>

      {/* 2D Interactive Blueprint & Hardware Dispatch Preview */}
      <section className={styles.section} style={{ animationDelay: '0.1s' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>1. Interactive 2D Blueprint & Hardware Bridge</h2>
          <p className={styles.sectionDescription}>
            Click any localized bounding box to inspect visual coordinates and preview real-time ROS2 Nav2 dispatch.
          </p>
        </div>

        <div className={styles.splitGrid}>
          {/* Blueprint SVG Canvas */}
          <div className={styles.card}>
            <div className={styles.mapViewer}>
              <svg className={styles.svgOverlay} viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Simulated Blueprint Room Walls */}
                <rect x="5" y="5" width="90" height="90" fill="none" stroke="#334155" strokeWidth="1" />
                <path d="M 5 50 L 30 50 M 70 50 L 95 50" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                <circle cx="50" cy="50" r="3" fill="#38bdf8" opacity="0.6" />
                <text x="50" y="56" fill="#94a3b8" fontSize="2.5" textAnchor="middle" fontFamily="monospace">Room Center</text>

                {/* Localized Bounding Boxes */}
                {SAMPLE_OBJECTS.map((obj) => (
                  <g key={obj.id} onClick={() => setSelectedObjectId(obj.id)}>
                    <rect
                      x={obj.xmin}
                      y={obj.ymin}
                      width={obj.xmax - obj.xmin}
                      height={obj.ymax - obj.ymin}
                      className={`${styles.bboxRect} ${selectedObjectId === obj.id ? styles.bboxRectActive : ''}`}
                    />
                    <text
                      x={obj.xmin + 1}
                      y={obj.ymin - 1.5}
                      fill={selectedObjectId === obj.id ? "#38bdf8" : "#00ff9d"}
                      fontSize="2.8"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {obj.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', textAlign: 'center' }}>
              💡 Click bounding boxes above to test real-time coordinate extraction
            </div>
          </div>

          {/* ROS2 Payload & Object Inspector */}
          <div className={styles.card}>
            <div className={styles.inspectorBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: '#00ff9d', fontWeight: 'bold' }}>SELECTED ENTITY</span>
                <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {selectedObj.type}
                </span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>
                {selectedObj.label} (`{selectedObj.id}`)
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                {selectedObj.desc}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  🤖 ROS2 Nav2 FollowWaypoints Payload Preview:
                </div>
                <pre className={styles.jsonPreview}>
{`{
  "action": "Nav2_FollowWaypoints",
  "frame_id": "map",
  "target": "${selectedObj.id}",
  "metric_coordinates": {
    "x_meters": ${calculatedX},
    "y_meters": ${calculatedY},
    "z_meters": 0.00
  },
  "pose": {
    "position": { "x": ${calculatedX}, "y": ${calculatedY}, "z": 0.0 },
    "orientation": { "x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0 }
  }
}`}
                </pre>
              </div>

              <button 
                onClick={handleSimulateDispatch}
                className={styles.btn}
                style={{ width: '100%', marginTop: '1rem', background: '#0284c7', color: '#fff', padding: '0.6rem', fontWeight: 'bold' }}
              >
                🚀 Dispatch Path to ROS2 Action Server
              </button>

              {toastMessage && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(0,255,157,0.15)', border: '1px solid #00ff9d', borderRadius: '6px', color: '#00ff9d', fontSize: '0.75rem' }}>
                  ✓ {toastMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Simulated VLA Model Q&A Playback Section */}
      <section className={styles.section} style={{ animationDelay: '0.2s' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>2. Multimodal VLA Reasoning Simulator</h2>
          <p className={styles.sectionDescription}>
            Demonstrating how Gemini 3.7 Flash correlates spatial topology with natural language queries.
          </p>
        </div>

        <div className={styles.card}>
          {/* Playback Controls */}
          <div className={styles.playbackControls}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#94a3b8' }}>
              Dialogue Turn: <span style={{ color: '#00ff9d', fontWeight: 'bold' }}>{Math.min(qaIndex, MOCK_QA.length)}</span> / {MOCK_QA.length}
            </div>
            <div className={styles.btnGroup}>
              <button 
                className={`${styles.btn} ${isPlaying ? styles.btnActive : ''}`} 
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button 
                className={styles.btn} 
                onClick={() => { setQaIndex(prev => Math.min(prev + 1, MOCK_QA.length)); setIsPlaying(false); }}
              >
                ⏭ Step
              </button>
              <button 
                className={styles.btn} 
                onClick={() => { setQaIndex(0); setIsPlaying(true); }}
              >
                ↺ Restart
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className={styles.chatContainer}>
            {MOCK_QA.slice(0, qaIndex).map((msg, idx) => (
              <div 
                key={idx} 
                className={`${styles.chatMessage} ${msg.sender === 'user' ? styles.chatUser : styles.chatAgent}`}
              >
                {msg.sender === 'agent' && <span className={styles.bold}>Gemini VLA: </span>}
                {msg.text}
              </div>
            ))}
            {qaIndex < MOCK_QA.length && qaIndex % 2 !== 0 && isPlaying && (
              <div className={`${styles.chatMessage} ${styles.chatAgent}`}>
                <span className={styles.bold}>Gemini VLA: </span> 
                <span style={{ opacity: 0.7 }}>Analyzing spatial topology...</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Technology Stack Directives */}
      <section className={styles.section} style={{ animationDelay: '0.3s' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>3. The 3-Step VLA Pipeline Directives</h2>
          <p className={styles.sectionDescription}>
            The architectural foundation powering GeminiSpace.
          </p>
        </div>
        <div className={styles.card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
            <div style={{ background: '#020617', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#00ff9d', fontWeight: 'bold', marginBottom: '0.5rem' }}>Step 1: Topology</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.5' }}>
                Ingests 8 directional photos (N $\to$ NW) taken from room center. Outputs structured semantic JSON graph.
              </div>
            </div>
            <div style={{ background: '#020617', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '0.5rem' }}>Step 2: Text-Bridge Map</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.5' }}>
                Translates room photos into geometric architectural text, synthesizing pure 2D floor plans with zero 3D distortion.
              </div>
            </div>
            <div style={{ background: '#020617', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '0.5rem' }}>Step 3: Localization</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.5' }}>
                Correlates generated 2D maps with topology entities to calculate percentage bounding boxes with directional fallbacks.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
