"use client";

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

const MOCK_QA = [
  { sender: 'user', text: 'Can you show me the overall structure of GeminiSpace?' },
  { sender: 'agent', text: 'Certainly. GeminiSpace is organized into multiple interactive zones. The interactive map provides a 2D overview, while the topology graph details the underlying network architecture.' },
  { sender: 'user', text: 'How do the different nodes communicate?' },
  { sender: 'agent', text: 'Nodes communicate using a localized mesh protocol. In the topology graph below, you can see the high-bandwidth backbone highlighted in blue, connecting the peripheral access points.' },
  { sender: 'user', text: 'What about the spatial distribution?' },
  { sender: 'agent', text: 'For spatial analysis, we use the 3D map. It allows us to visualize node density and vertical routing efficiently. Would you like to play the 3D simulation?' },
];

export default function ScholarPage() {
  const [qaIndex, setQaIndex] = useState(0);

  useEffect(() => {
    if (qaIndex < MOCK_QA.length) {
      const timer = setTimeout(() => {
        setQaIndex(prev => prev + 1);
      }, qaIndex % 2 === 0 ? 1500 : 3000); // User messages appear faster, agent takes time to "think"
      return () => clearTimeout(timer);
    }
  }, [qaIndex]);

  return (
    <main className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.title}>Welcome to GeminiSpace</h1>
        <p className={styles.subtitle}>
          An interactive exploration environment combining high-fidelity spatial mapping, 
          real-time network topology, and intelligent VLA-assisted analysis.
        </p>
      </section>

      {/* Interactive Map Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Interactive Map</h2>
          <p className={styles.sectionDescription}>
            Explore the 2D layout of our data centers and edge locations.
          </p>
        </div>
        <div className={styles.card}>
          {/* Placeholder for pre-generated interactive map */}
          <div className={styles.placeholderImage}>
            [ Interactive Map Simulation Offline ]
          </div>
        </div>
      </section>

      {/* Topology Graph Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Network Topology</h2>
          <p className={styles.sectionDescription}>
            Visualize the complex relationships and routing between core nodes.
          </p>
        </div>
        <div className={styles.card}>
          {/* Placeholder for pre-generated topology graph */}
          <div className={styles.placeholderImage}>
            [ Topology Graph Visualization Offline ]
          </div>
        </div>
      </section>

      {/* 3D Map Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>3D Spatial Map</h2>
          <p className={styles.sectionDescription}>
            Dive deep into the multi-layered architecture with our 3D spatial viewer.
          </p>
        </div>
        <div className={styles.card}>
          {/* Placeholder for 3D map */}
          <div className={styles.placeholderImage}>
            [ 3D Map Rendering Offline ]
          </div>
        </div>
      </section>

      {/* VLA Model Q&A Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>VLA Model Analysis</h2>
          <p className={styles.sectionDescription}>
            Observe how our pre-trained Vision-Language-Action model interprets the environment.
          </p>
        </div>
        <div className={styles.card}>
          <div className={styles.chatContainer}>
            {MOCK_QA.slice(0, qaIndex).map((msg, idx) => (
              <div 
                key={idx} 
                className={`${styles.chatMessage} ${msg.sender === 'user' ? styles.chatUser : styles.chatAgent}`}
              >
                {msg.sender === 'agent' && <span className={styles.bold}>VLA Model: </span>}
                {msg.text}
              </div>
            ))}
            {qaIndex < MOCK_QA.length && qaIndex % 2 !== 0 && (
              <div className={`${styles.chatMessage} ${styles.chatAgent}`}>
                <span className={styles.bold}>VLA Model: </span> 
                <span style={{ opacity: 0.7 }}>Analyzing query...</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
