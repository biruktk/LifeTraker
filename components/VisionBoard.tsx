import React, { useState, useEffect, useRef } from 'react';

interface VisionImage {
  id: number;
  src: string;
  area: number;
  aspectRatio: number; // width / height
}

interface VisionBoardProps {
  userId: string;
}

// IndexedDB Utilities
const DB_NAME = 'LifeTrackerDB';
const STORE_NAME = 'boards';

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveToDB = async (userId: string, images: VisionImage[]) => {
    try {
        const db = await initDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(images, userId);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error("Failed to save to DB", e);
        // Fallback to localStorage if IDB fails? likely quota will fail there too.
        // Alert user critical error.
        alert("Failed to save images. Database error.");
    }
};

const loadFromDB = async (userId: string): Promise<VisionImage[] | null> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(userId);
            req.onsuccess = () => resolve(req.result ? req.result : null);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error("Failed to load from DB", e);
        return null;
    }
};

const VisionBoard: React.FC<VisionBoardProps> = ({ userId }) => {
  const [images, setImages] = useState<VisionImage[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Load images on mount (Migrate from LS if needed)
  useEffect(() => {
    const loadImages = async () => {
        // 1. Try Load from IDB
        const dbImages = await loadFromDB(userId);
        
        if (dbImages) {
            setImages(dbImages);
        } else {
            // 2. Fallback / Migration from LocalStorage
            const lsKey = `vision_board_images_${userId}`;
            const savedLS = localStorage.getItem(lsKey);
            if (savedLS) {
                try {
                    const parsed = JSON.parse(savedLS);
                    setImages(parsed);
                    // Migrate to IDB
                    await saveToDB(userId, parsed);
                    // Clear LS to free space
                    localStorage.removeItem(lsKey);
                } catch (e) {
                    console.error('Error loading legacy vision board:', e);
                }
            }
        }
    };
    loadImages();
  }, [userId]);

  // Handle Fullscreen Change Events
  useEffect(() => {
      const handleFullScreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullScreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  // Save images
  const saveImages = async (newImages: VisionImage[]) => {
    setImages(newImages);
    await saveToDB(userId, newImages);
  };

  const compressImage = (src: string, maxWidth = 1600): Promise<{ src: string; area: number; aspectRatio: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        const aspectRatio = width / height;

        // Resize logic - Keep High Quality for Unlimited feel
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // 0.85 quality for better looking images since we have "unlimited" space
            const compressed = canvas.toDataURL('image/jpeg', 0.85); 
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

    try {
      // Process all files
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.readAsDataURL(file);
          });

          const compressed = await compressImage(dataUrl);
          newImagesData.push({
            id: Date.now() + Math.random(), // Ensure unique ID even in fast loops
            src: compressed.src,
            area: compressed.area,
            aspectRatio: compressed.aspectRatio
          });
        }
      }

      // Sort ONLY the new batch by aspect ratio (Widest first)
      newImagesData.sort((a, b) => b.aspectRatio - a.aspectRatio);
      
      // Add new images to the top of the list
      const updatedImages = [...newImagesData, ...images];
      await saveImages(updatedImages);
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred during upload. Please try again.');
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
      e.stopPropagation(); // Prevent opening/selecting
      const newImages = [...images];
      
      if (direction === 'UP' && index > 0) {
          // Swap with previous
          [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
      } else if (direction === 'DOWN' && index < newImages.length - 1) {
          // Swap with next
          [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      }
      saveImages(newImages);
  };

  const deleteSelected = () => {
    if (window.confirm(`Delete ${selectedImages.size} image(s)?`)) {
      const remainingImages = images.filter((img) => !selectedImages.has(img.id));
      saveImages(remainingImages);
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
      {/* Header - Hidden in Fullscreen */}
      {!isFullscreen && (
          <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">My Vision Board</h1>
                <p className="text-emerald-400/60">Visualize your dreams and goals.</p>
              </div>
              <div className="flex gap-2">
                  <button 
                    onClick={toggleAppFullscreen}
                    className="p-3 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all shadow-lg border border-emerald-500/20"
                    title="Enter Fullscreen"
                  >
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  </button>
              </div>
          </div>
      )}

      {/* Fullscreen Floating Exit Button */}
      {isFullscreen && (
          <button 
            onClick={toggleAppFullscreen}
            className="fixed top-6 right-6 z-50 p-3 rounded-full bg-black/50 hover:bg-white/20 text-white/50 hover:text-white transition-all backdrop-blur-sm border border-white/10"
            title="Exit Fullscreen"
          >
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
      )}

      {/* Masonry Grid */}
      <div className={`columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 ${isFullscreen ? 'mx-auto max-w-[1800px]' : ''}`}>
        {images.map((img, index) => (
          <div
            key={img.id}
            className={`break-inside-avoid relative group cursor-pointer rounded-xl overflow-hidden shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 ${!editMode ? 'hover:scale-[1.02]' : ''} bg-black/20`}
            onClick={() => editMode ? toggleSelection(img.id) : setFullscreenImage(img.src)}
          >
            <img src={img.src} alt="Vision" className="w-full h-auto object-cover block" />
            
            {/* Edit Mode Overlay */}
            {editMode && (
                <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col justify-between p-3 transition-colors ${selectedImages.has(img.id) ? 'bg-emerald-500/20 backdrop-blur-none' : ''}`}>
                    {/* Selection Checkbox */}
                    <div className="flex justify-between items-start">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${selectedImages.has(img.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-white/10 border-white/80 hover:bg-white/20'}`}>
                            {selectedImages.has(img.id) && <span className="text-white font-bold text-sm">✓</span>}
                        </div>
                    </div>

                    {/* Reordering Controls */}
                    <div className="flex justify-center gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={(e) => moveImage(index, 'UP', e)}
                            disabled={index === 0}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/30 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title="Move Backward"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-xs font-mono text-white/50">{index + 1}</span>
                        <button 
                            onClick={(e) => moveImage(index, 'DOWN', e)}
                            disabled={index === images.length - 1}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/30 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title="Move Forward"
                        >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Loading State */}
      {isUploading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-emerald-400 font-bold text-xl animate-pulse">Uploading to Cloud...</p>
          </div>
      )}

      {images.length === 0 && !isUploading && (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-emerald-500/20 rounded-3xl bg-black/10 text-emerald-500/40">
              <span className="text-6xl mb-4">🖼️</span>
              <p>Your vision board is empty.</p>
              <p className="text-sm">Upload images to start visualizing.</p>
          </div>
      )}

      {/* Bottom Bar - Hidden in Fullscreen */}
      {!isFullscreen && (
          <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-emerald-950/90 backdrop-blur-xl border-t border-emerald-500/20 p-4 z-40 flex justify-center gap-3 flex-wrap shadow-[0_-5px_20px_rgba(0,0,0,0.4)]">
            {!editMode ? (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-orange-600/90 hover:bg-orange-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
                >
                  ✏️ Edit / Move
                </button>
                <label className="cursor-pointer bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2">
                  <span>📷 Add Images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </>
            ) : (
              <>
                <button
                  onClick={deleteSelected}
                  className={`bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all ${selectedImages.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={selectedImages.size === 0}
                >
                  🗑️ Delete ({selectedImages.size})
                </button>
                <button
                  onClick={selectAll}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
                >
                  {selectedImages.size === images.length && images.length > 0 ? '◻️ Deselect All' : '☑️ Select All'}
                </button>
                <button
                  onClick={() => { setEditMode(false); setSelectedImages(new Set()); }}
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
                >
                  ✖️ Done
                </button>
              </>
            )}
          </div>
      )}

      {/* Single Image Lightbox Overlay */}
      {fullscreenImage && (
        <div 
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 rounded-full w-10 h-10 flex items-center justify-center text-2xl transition-colors"
            onClick={() => setFullscreenImage(null)}
          >
            ×
          </button>
          <img
            src={fullscreenImage}
            alt="Fullscreen"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default VisionBoard;