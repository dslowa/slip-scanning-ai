"use client";

import { useState, useRef, MouseEvent, WheelEvent } from "react";

interface ReceiptImageProps {
    src: string;
    alt: string;
}

export default function ReceiptImage({ src, alt }: ReceiptImageProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    const handleZoomToggle = (e: MouseEvent) => {
        // Only toggle zoom if not dragging
        if (e.detail > 1) return; // Prevent double click zoom if we want custom behavior

        if (scale === 1) {
            setScale(2);
            // Center zoom on click position relative to image
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                setPosition({
                    x: (0.5 - x) * rect.width,
                    y: (0.5 - y) * rect.height,
                });
            }
        } else {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && scale > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(Math.max(scale * delta, 1), 5);
            setScale(newScale);
            if (newScale === 1) setPosition({ x: 0, y: 0 });
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-hidden cursor-zoom-in bg-gray-950 flex items-center justify-center rounded-xl border border-border"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleZoomToggle}
        >
            <div
                className="transition-transform duration-200 ease-out select-none pointer-events-none"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isDragging ? "none" : "transform 0.2s ease-out",
                }}
            >
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    className="max-w-full max-h-[75vh] object-contain"
                    draggable={false}
                />
            </div>

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); setScale(Math.min(scale + 0.5, 5)); }}
                    className="bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                    title="Zoom In"
                >
                    +
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setScale(Math.max(scale - 0.5, 1)); if (scale <= 1.5) setPosition({ x: 0, y: 0 }); }}
                    className="bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                    title="Zoom Out"
                >
                    -
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setScale(1); setPosition({ x: 0, y: 0 }); }}
                    className="bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors text-xs"
                    title="Reset"
                >
                    Reset
                </button>
            </div>

            {scale > 1 && (
                <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
                    {Math.round(scale * 100)}% Zoom • Drag to Pan
                </div>
            )}
        </div>
    );
}
