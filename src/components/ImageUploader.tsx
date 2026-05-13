import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (base64: string) => void;
  label?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, label }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress with 0.7 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    try {
      setError('Processing image...');
      const compressed = await compressImage(file);
      setError(null);
      onChange(compressed);
    } catch (err) {
      console.error('Image compression error:', err);
      setError('Failed to process image');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase italic px-1">{label}</label>}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative min-h-[160px] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 overflow-hidden ${
          isDragging 
          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/10' 
          : value 
            ? 'border-transparent' 
            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          accept="image/*"
          className="hidden"
        />

        {value ? (
          <>
            <img 
              src={value || undefined} 
              alt="Preview" 
              className="absolute inset-0 w-full h-full object-cover transition-transform hover:scale-105" 
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-[10px] font-black tracking-widest uppercase bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">Change Photo</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg backdrop-blur-md transition-colors"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mx-auto mb-2 text-zinc-400 dark:text-zinc-600">
              <Upload size={24} />
            </div>
            <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
              Drop image here or <span className="text-orange-600">click to browse</span>
            </p>
            <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
              JPG, PNG, WEBP — AUTO OPTIMIZED
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[9px] font-black text-orange-600 uppercase tracking-tight bg-orange-50 dark:bg-orange-950/30 px-3 py-1.5 rounded-lg border border-orange-200/50 dark:border-orange-500/20">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
