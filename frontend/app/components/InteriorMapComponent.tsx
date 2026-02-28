"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ObjectLocation } from "../lib/api";

interface InteriorMapProps {
    mapImage: string;
    locations: ObjectLocation[];
    selectedObjectId: string | null;
    onSelectObject: (id: string | null) => void;
}

export default function InteriorMapComponent({ mapImage, locations, selectedObjectId, onSelectObject }: InteriorMapProps) {
    if (!mapImage) return null;

    return (
        <div className="w-full h-full relative">
            <img src={mapImage} alt="Bird's Eye View" className="w-full h-full object-cover" />

            {locations?.map(loc => (
                <div
                    key={loc.object_id}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectObject(loc.object_id === selectedObjectId ? null : loc.object_id);
                    }}
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
        </div>
    );
}
