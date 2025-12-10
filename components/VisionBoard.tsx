import React, { useState, useEffect, useRef } from 'react';
import { VisionImage } from '../types';
import { uploadFile, dataURLtoBlob } from '../services/imageService';
import { SUPABASE_STORAGE_URL } from '../services/supabaseClient';

interface VisionBoardProps {
  userId: string;
  images: VisionImage[];
  onUpdateImages: (images: VisionImage[]) => void;
}

const VisionBoard: React.FC<VisionBoardProps> = ({ userId, images = [], onUpdateImages }) => {
  const [editMode, setEditMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handle Fullscreen Change Events
  useEffect(() => {
      const handleFullScreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullScreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  // --- LIGHTBOX NAVIGATION LOGIC ---
  const handleNext = () => {
      setLightboxIndex(prev => (prev !== null ? (prev + 1) % images.length : null));
  };

  const handlePrev = () => {
      setLightboxIndex(prev => (prev !== null ? (prev - 1 + images.length) % images.length : null));
  };

  // Keyboard Navigation
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (lightboxIndex === null) return;
          if (e.key === 'ArrowRight') handleNext();
          if (e.key === 'ArrowLeft') handlePrev();
          if (e.key === 'Escape') setLightboxIndex(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, images]);

  // Client-side compression before upload
  const compressImage = (src: string, maxWidth = 1280): Promise<{ src: string; area: number; aspectRatio: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const aspectRatio = width / height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.8); 
            resolve({
                src: compressed,
                area: width * height,
                aspectRatio: aspectRatio
            });
        }
      };
      img.src = src;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsUploading(true);
    const newImagesData: VisionImage[] = [];
    let hasError = false;

    try {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          try {
              // 1. Read file
              const reader = new FileReader();
              const dataUrl = await new Promise<string>((resolve) => {
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.readAsDataURL(file);
              });

              // 2. Compress locally
              const compressed = await compressImage(dataUrl);

              // 3. Convert to Blob for Upload
              const blob = dataURLtoBlob(compressed.src);

              // 4. Upload to Supabase Storage (The "Folder")
              const publicUrl = await uploadFile(blob, userId);

              newImagesData.push({
                id: Date.now() + Math.random(),
                src: publicUrl, // Save URL, not base64
                area: compressed.area,
                aspectRatio: compressed.aspectRatio
              });
          } catch (innerErr) {
              console.error("Error uploading specific file:", innerErr);
              hasError = true;
          }
        }
      }

      if (newImagesData.length > 0) {
          newImagesData.sort((a, b) => b.aspectRatio - a.aspectRatio);
          const updatedImages = [...newImagesData, ...images];
          onUpdateImages(updatedImages);
      }
      
      if (hasError && newImagesData.length === 0) {
         // Only show popup if NO images succeeded (likely RLS error)
         if (window.confirm(`Failed to upload images. Ensure your bucket is Public and has policies.\n\nOpen Dashboard Instructions?`)) {
              window.open(SUPABASE_STORAGE_URL, '_blank');
         }
      }
      
    } catch (error: any) {
      console.error('Batch Upload error:', error);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedImages(newSelected);
  };

  const moveImage = (index: number, direction: 'UP' | 'DOWN', e: React.MouseEvent) => {
      e.stopPropagation();
      const newImages = [...images];
      if (direction === 'UP' && index > 0) {
          [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
      } else if (direction === 'DOWN' && index < newImages.length - 1) {
          [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      }
      onUpdateImages(newImages);
  };

  const deleteSelected = () => {
    if (window.confirm(`Delete ${selectedImages.size} image(s)?`)) {
      const remainingImages = images.filter((img) => !selectedImages.has(img.id));
      onUpdateImages(remainingImages);
      setEditMode(false);
      setSelectedImages(new Set());
    }
  };

  const selectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      const allIds = new Set(images.map((img) => img.id));
      setSelectedImages(allIds);
    }
  };

  const toggleAppFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(err => {
              console.error(`Error enabling full-screen mode: ${err.message}`);
          });
      } else {
          document.exitFullscreen();
      }
  };

  return (
    <div 
        ref={containerRef} 
        className={`min-h-screen w-full relative pb-32 animate-fade-in transition-colors duration-500 ${isFullscreen ? 'bg-black p-4 md:p-8 overflow-y-auto' : ''}`}
    >
      {!isFullscreen && (
          <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">My Vision Board</h1>
                <p className="text-emerald-400/60">Visualize your dreams and goals.</p>
              </div>
              <div className="flex gap-2">
                  <button onClick={toggleAppFullscreen} className="p-3 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all shadow-lg border border-emerald-500/20" title="Enter Fullscreen">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  </button>
              </div>
          </div>
      )}

      {isFullscreen && (
          <button onClick={toggleAppFullscreen} className="fixed top-6 right-6 z-50 p-3 rounded-full bg-black/50 hover:bg-white/20 text-white/50 hover:text-white transition-all backdrop-blur-sm border border-white/10" title="Exit Fullscreen">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
      )}

      <div className={`columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 ${isFullscreen ? 'mx-auto max-w-[1800px]' : ''}`}>
        {images.map((img, index) => (
          <div
            key={img.id}
            className={`break-inside-avoid relative group cursor-pointer rounded-xl overflow-hidden shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 ${!editMode ? 'hover:scale-[1.02]' : ''} bg-black/20`}
            onClick={() => editMode ? toggleSelection(img.id) : setLightboxIndex(index)}
          >
            <img src={img.src} alt="Vision" className="w-full h-auto object-cover block" />
            {editMode && (
                <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col justify-between p-3 transition-colors ${selectedImages.has(img.id) ? 'bg-emerald-500/20 backdrop-blur-none' : ''}`}>
                    <div className="flex justify-between items-start">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${selectedImages.has(img.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-white/10 border-white/80 hover:bg-white/20'}`}>
                            {selectedImages.has(img.id) && <span className="text-white font-bold text-sm">✓</span>}
                        </div>
                    </div>
                    <div className="flex justify-center gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => moveImage(index, 'UP', e)} disabled={index === 0} className="p-2 rounded-full bg-white/10 hover:bg-white/30 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-xs font-mono text-white/50">{index + 1}</span>
                        <button onClick={(e) => moveImage(index, 'DOWN', e)} disabled={index === images.length - 1} className="p-2 rounded-full bg-white/10 hover:bg-white/30 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            )}
          </div>
        ))}
      </div>
      
      {isUploading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-emerald-400 font-bold text-xl animate-pulse">Uploading to Cloud Folder...</p>
          </div>
      )}

      {images.length === 0 && !isUploading && (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-emerald-500/20 rounded-3xl bg-black/10 text-emerald-500/40">
              <span className="text-6xl mb-4">🖼️</span>
              <p>Your vision board is empty.</p>
          </div>
      )}

      {!isFullscreen && (
          <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-emerald-950/90 backdrop-blur-xl border-t border-emerald-500/20 p-4 z-40 flex justify-center gap-3 flex-wrap shadow-[0_-5px_20px_rgba(0,0,0,0.4)]">
            {!editMode ? (
              <>
                <button onClick={() => setEditMode(true)} className="bg-orange-600/90 hover:bg-orange-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all">✏️ Edit</button>
                <label className="cursor-pointer bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2">
                  <span>📷 Upload</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </>
            ) : (
              <>
                <button onClick={deleteSelected} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all" disabled={selectedImages.size === 0}>🗑️ Delete</button>
                <button onClick={selectAll} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all">Select All</button>
                <button onClick={() => { setEditMode(false); setSelectedImages(new Set()); }} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all">✖️ Done</button>
              </>
            )}
          </div>
      )}

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 rounded-full w-10 h-10 flex items-center justify-center text-2xl transition-colors z-50">×</button>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center z-50 hidden md:flex" onClick={(e) => { e.stopPropagation(); handlePrev(); }}>←</button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center z-50 hidden md:flex" onClick={(e) => { e.stopPropagation(); handleNext(); }}>→</button>
          <img src={images[lightboxIndex].src} alt="Fullscreen" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-fade-in select-none" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default VisionBoard;