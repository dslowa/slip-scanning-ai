"use client";

import { useState, useRef, MouseEvent, WheelEvent, useCallback } from "react";

interface ReceiptImageProps {
    src: string;
    alt: string;
}

export default function ReceiptImage({ src, alt }: ReceiptImageProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const hasDragged = useRef(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    const handleZoomToggle = (e: MouseEvent) => {
        // Prevent click if we were just dragging
        if (hasDragged.current) return;

        if (scale === 1) {
            setScale(2);
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
            hasDragged.current = false;
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && scale > 1) {
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;

            // Set dragged flag if we've moved significantly
            if (Math.abs(newX - position.x) > 2 || Math.abs(newY - position.y) > 2) {
                hasDragged.current = true;
            }

            setPosition({ x: newX, y: newY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = useCallback((e: WheelEvent) => {
        // Stop the page from scrolling while zooming
        e.preventDefault();

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate zoom factor
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(scale * delta, 1), 5);

        if (newScale !== scale) {
            // Zoom centered on mouse
            const scaleRatio = newScale / scale;

            // Move position to keep mouse point fixed
            const newX = mouseX - (mouseX - position.x) * scaleRatio;
            const newY = mouseY - (mouseY - position.y) * scaleRatio;

            setScale(newScale);

            if (newScale === 1) {
                setPosition({ x: 0, y: 0 });
            } else {
                setPosition({ x: newX, y: newY });
            }
        }
    }, [scale, position]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden bg-gray-950 flex items-center justify-center rounded-xl border border-border select-none touch-none ${scale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
                }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleZoomToggle}
        >
            <div
                className="select-none pointer-events-none"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isDragging ? "none" : "transform 0.1s ease-out",
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
                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        try {
                            const response = await fetch(src);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `receipt-${Date.now()}.jpg`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                        } catch (err) {
                            console.error("Failed to download image:", err);
                        }
                    }}
                    className="bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                    title="Download Image"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
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
