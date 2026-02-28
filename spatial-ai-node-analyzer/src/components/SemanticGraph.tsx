import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SpatialNode } from '../services/gemini';

interface SemanticGraphProps {
  data: SpatialNode;
}

export default function SemanticGraph({ data }: SemanticGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height]);

    // Prepare graph data
    const nodes: any[] = [];
    const links: any[] = [];

    // Root node
    const rootId = data.node_name;
    nodes.push({ id: rootId, group: 'root', label: data.node_name });

    // Static Anchors
    data.static_anchors.forEach(anchor => {
      nodes.push({ id: anchor.anchor_id, group: 'anchor', label: anchor.type });
      links.push({ source: rootId, target: anchor.anchor_id, type: 'contains' });
    });

    // Dynamic Objects
    data.dynamic_objects.forEach(obj => {
      nodes.push({ id: obj.object_id, group: 'object', label: obj.type });
      links.push({ source: rootId, target: obj.object_id, type: 'contains' });
    });

    // Navigable Edges
    data.navigable_edges.forEach(edge => {
      nodes.push({ id: edge.edge_id, group: 'edge', label: edge.description });
      links.push({ source: rootId, target: edge.edge_id, type: 'connects' });
    });

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(40));

    // Add a group for zooming
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Draw links
    const link = g.append('g')
      .attr('stroke', '#555')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1.5);

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node shapes based on group
    node.each(function(d: any) {
      const el = d3.select(this);
      if (d.group === 'root') {
        // Purple Cube (represented as a rect for simplicity, or a polygon)
        el.append('rect')
          .attr('width', 30)
          .attr('height', 30)
          .attr('x', -15)
          .attr('y', -15)
          .attr('fill', '#A020F0')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
      } else if (d.group === 'anchor') {
        // Green Cube
        el.append('rect')
          .attr('width', 20)
          .attr('height', 20)
          .attr('x', -10)
          .attr('y', -10)
          .attr('fill', '#008000')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5);
      } else if (d.group === 'object') {
        // Orange Cube
        el.append('rect')
          .attr('width', 16)
          .attr('height', 16)
          .attr('x', -8)
          .attr('y', -8)
          .attr('fill', '#FFA500')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
      } else if (d.group === 'edge') {
        // Red Dot
        el.append('circle')
          .attr('r', 6)
          .attr('fill', '#FF0000');
      }
    });

    // Node labels
    node.append('text')
      .text((d: any) => d.label)
      .attr('x', 18)
      .attr('y', 4)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px')
      .attr('fill', '#ccc');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[#111]/80 backdrop-blur border border-[#333] p-3 rounded-lg text-[10px] font-mono text-[#888] flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#A020F0] border border-white"></div>
          <span>Node (Floor/Room)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#008000] border border-white"></div>
          <span>Static Anchor</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#FFA500] border border-white"></div>
          <span>Dynamic Object</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#FF0000] rounded-full"></div>
          <span>Navigable Edge</span>
        </div>
      </div>
    </div>
  );
}
