"use client";

import { useState, useCallback } from "react";

interface ImageViewerProps {
  imageUrl: string | null;
  alt: string;
}

export default function ImageViewer({ imageUrl }: ImageViewerProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
  }, []);

  if (!imageUrl) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-background rounded-lg border border-border">
        <div className="text-center text-muted">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">No image available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail / Preview */}
      <div
        className="relative w-full h-full min-h-[400px] bg-background rounded-lg border border-border overflow-hidden cursor-pointer group"
        onClick={() => setLightboxOpen(true)}
      >
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {/* Using a placeholder div styled as an image preview since actual images may not exist */}
          <div className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-900 rounded flex flex-col items-center justify-center">
            <svg className="w-20 h-20 text-muted/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xs text-muted/50 font-mono">{imageUrl}</p>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg px-4 py-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            <span className="text-white text-sm">Click to zoom</span>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => {
            setLightboxOpen(false);
            setZoom(1);
          }}
        >
          {/* Controls */}
          <div
            className="absolute top-4 right-4 flex items-center gap-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <span className="text-white text-sm font-mono px-2">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-sm"
              title="Reset zoom"
            >
              Reset
            </button>
            <button
              onClick={() => {
                setLightboxOpen(false);
                setZoom(1);
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-2"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image container */}
          <div
            className="overflow-auto max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="transition-transform duration-200 ease-out"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
            >
              <div className="w-[500px] h-[700px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg flex flex-col items-center justify-center">
                <svg className="w-24 h-24 text-muted/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-muted/50 font-mono">{imageUrl}</p>
                <p className="text-xs text-muted/30 mt-2">Slip Image Preview</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
