'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SpatialNode } from '../lib/api';

interface SemanticGraphProps {
    data: SpatialNode;
}

export default function SemanticGraph({ data }: SemanticGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data) return;

        const width = svgRef.current.clientWidth || 800;
        const height = svgRef.current.clientHeight || 500;

        // Clear previous graph
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('viewBox', [0, 0, width, height]);

        // Prepare graph data
        const nodes: any[] = [];
        const links: any[] = [];
        const existingNodeIds = new Set<string>();

        // Root vantage center node
        const rootId = data.node_name;
        nodes.push({ id: rootId, group: 'root', label: data.node_name });
        existingNodeIds.add(rootId);

        // SLAM Seam Keypoints (Perimeter Anchor Ring)
        data.seam_keypoints?.forEach(kp => {
            nodes.push({ 
                id: kp.keypoint_id, 
                group: 'keypoint', 
                label: `◆ ${kp.keypoint_id} (${kp.bearing_degrees}°)`,
                bearing: kp.bearing_degrees,
                desc: kp.visual_feature
            });
            existingNodeIds.add(kp.keypoint_id);
            // Radial connection from vantage center to keypoint
            links.push({ source: rootId, target: kp.keypoint_id, type: 'radial', label: `${kp.bearing_degrees}°` });
        });

        // Loop closure perimeter polygon connecting consecutive keypoints
        if (data.seam_keypoints && data.seam_keypoints.length > 1) {
            for (let i = 0; i < data.seam_keypoints.length; i++) {
                const currentKp = data.seam_keypoints[i];
                const nextKp = data.seam_keypoints[(i + 1) % data.seam_keypoints.length];
                links.push({
                    source: currentKp.keypoint_id,
                    target: nextKp.keypoint_id,
                    type: 'perimeter',
                    label: 'Perimeter Seam'
                });
            }
        }

        // Static Anchors
        data.static_anchors?.forEach(anchor => {
            nodes.push({ id: anchor.anchor_id, group: 'anchor', label: `${anchor.type} (${anchor.anchor_id})` });
            links.push({ source: rootId, target: anchor.anchor_id, type: 'contains' });
            existingNodeIds.add(anchor.anchor_id);

            // Link to associated SLAM keypoint if specified
            anchor.associated_keypoints?.forEach(kpId => {
                if (existingNodeIds.has(kpId)) {
                    links.push({ source: anchor.anchor_id, target: kpId, type: 'anchored_to', label: 'anchored_to' });
                }
            });
        });

        // Dynamic Objects
        data.dynamic_objects?.forEach(obj => {
            nodes.push({ id: obj.object_id, group: 'object', label: `${obj.type} (${obj.object_id})` });
            links.push({ source: rootId, target: obj.object_id, type: 'contains' });
            existingNodeIds.add(obj.object_id);

            if (obj.relative_to_keypoint && existingNodeIds.has(obj.relative_to_keypoint)) {
                links.push({ source: obj.object_id, target: obj.relative_to_keypoint, type: 'anchored_to', label: 'relative_to' });
            }
        });

        // Spatial Relational Edges (Inter-object spatial relations)
        data.spatial_relations?.forEach(rel => {
            if (existingNodeIds.has(rel.source) && existingNodeIds.has(rel.target)) {
                links.push({ 
                    source: rel.source, 
                    target: rel.target, 
                    type: 'relation', 
                    label: rel.relation + (rel.cardinal_direction ? ` (${rel.cardinal_direction})` : '') 
                });
            }
        });

        // Navigable Edges
        data.navigable_edges?.forEach(edge => {
            nodes.push({ id: edge.edge_id, group: 'edge', label: edge.description });
            links.push({ source: rootId, target: edge.edge_id, type: 'connects' });
            existingNodeIds.add(edge.edge_id);
        });

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance((d: any) => {
                if (d.type === 'perimeter') return 80;
                if (d.type === 'radial') return 140;
                if (d.type === 'relation') return 70;
                return 100;
            }))
            .force('charge', d3.forceManyBody().strength(-320))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide().radius(48));

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
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', (d: any) => {
                if (d.type === 'perimeter') return '#00FF9D';
                if (d.type === 'relation') return '#38BDF8';
                if (d.type === 'anchored_to') return '#F59E0B';
                if (d.type === 'radial') return 'rgba(0, 255, 157, 0.2)';
                return '#475569';
            })
            .attr('stroke-dasharray', (d: any) => {
                if (d.type === 'perimeter') return '6,3';
                if (d.type === 'relation') return '4,3';
                if (d.type === 'anchored_to') return '2,2';
                if (d.type === 'radial') return '1,4';
                return 'none';
            })
            .attr('stroke-opacity', (d: any) => d.type === 'perimeter' ? 0.9 : 0.6)
            .attr('stroke-width', (d: any) => d.type === 'perimeter' ? 2 : d.type === 'relation' ? 2 : 1.2);

        // Draw link labels for spatial relations
        const linkText = g.append('g')
            .selectAll('text')
            .data(links.filter((d: any) => d.type === 'relation' || d.type === 'perimeter'))
            .join('text')
            .text((d: any) => d.label)
            .attr('font-family', 'ui-monospace, monospace')
            .attr('font-size', '8px')
            .attr('fill', (d: any) => d.type === 'perimeter' ? '#00FF9D' : '#38BDF8')
            .attr('text-anchor', 'middle');

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
        node.each(function (d: any) {
            const el = d3.select(this);
            if (d.group === 'root') {
                el.append('rect')
                    .attr('width', 34)
                    .attr('height', 34)
                    .attr('x', -17)
                    .attr('y', -17)
                    .attr('rx', 6)
                    .attr('fill', '#A855F7')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 2);
            } else if (d.group === 'keypoint') {
                // Diamond shape for SLAM keypoints
                el.append('polygon')
                    .attr('points', '0,-10 10,0 0,10 -10,0')
                    .attr('fill', '#00FF9D')
                    .attr('stroke', '#030712')
                    .attr('stroke-width', 1.5);
            } else if (d.group === 'anchor') {
                el.append('rect')
                    .attr('width', 22)
                    .attr('height', 22)
                    .attr('x', -11)
                    .attr('y', -11)
                    .attr('rx', 3)
                    .attr('fill', '#10B981')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1.5);
            } else if (d.group === 'object') {
                el.append('rect')
                    .attr('width', 18)
                    .attr('height', 18)
                    .attr('x', -9)
                    .attr('y', -9)
                    .attr('rx', 2)
                    .attr('fill', '#F59E0B')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1);
            } else if (d.group === 'edge') {
                el.append('circle')
                    .attr('r', 8)
                    .attr('fill', '#EF4444');
            }
        });

        // Node labels
        node.append('text')
            .text((d: any) => d.label)
            .attr('x', 18)
            .attr('y', 4)
            .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace')
            .attr('font-size', '10px')
            .attr('fill', '#e2e8f0');

        simulation.on('tick', () => {
            link
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);

            linkText
                .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
                .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 3);

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

    const handleDownload = () => {
        if (!svgRef.current) return;
        const svgEl = svgRef.current;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const canvas = document.createElement('canvas');
        canvas.width = svgEl.clientWidth * 2;
        canvas.height = svgEl.clientHeight * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const link = document.createElement('a');
            link.download = `slam_topology_${data.node_name || 'graph'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div className="w-full h-full bg-[#030712] relative overflow-hidden min-h-[440px]">
            {/* Download Button */}
            <button onClick={handleDownload}
                className="absolute top-3 right-3 z-20 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all hover:scale-105 bg-black/80 border border-[#333] text-[#00FF9D]">
                ⬇ SAVE SLAM GRAPH
            </button>

            <svg ref={svgRef} className="w-full h-full absolute inset-0" />

            {/* SLAM Legend */}
            <div className="absolute bottom-4 left-4 bg-[#0a0f1d]/90 backdrop-blur border border-white/10 p-3 rounded-lg text-[10px] font-mono text-[#94a3b8] flex flex-col gap-1.5 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#A855F7] rounded-sm"></div>
                    <span>Vantage Center (0,0)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-[#00FF9D] rotate-45"></div>
                    <span>SLAM Seam Keypoint (360° Invariant)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 border-t-2 border-dashed border-[#00FF9D]"></div>
                    <span>Loop Closure Perimeter Wall</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#10B981] rounded-sm"></div>
                    <span>Static Anchor</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#F59E0B] rounded-sm"></div>
                    <span>Dynamic Object</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 border-t-2 border-dashed border-[#38BDF8]"></div>
                    <span>Pairwise Spatial Relation</span>
                </div>
            </div>
        </div>
    );
}
