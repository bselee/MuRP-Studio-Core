import React, { useRef } from 'react';
import { ImageState } from '../types';

interface ImageUploaderProps {
  imageState: ImageState;
  onImageSelect: (state: ImageState) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ imageState, onImageSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onImageSelect({
        file,
        previewUrl: reader.result as string,
        base64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      onClick={triggerFileInput}
      className={`
        relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden group
        ${imageState.previewUrl ? 'border-gray-600 bg-gray-800' : 'border-gray-600 hover:border-yellow-500 bg-gray-800/50 hover:bg-gray-800'}
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {imageState.previewUrl ? (
        <>
          <img 
            src={imageState.previewUrl} 
            alt="Upload preview" 
            className="w-full h-full object-contain p-2"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white font-medium">Click to change image</p>
          </div>
        </>
      ) : (
        <div className="text-center p-6">
          <div className="w-12 h-12 mx-auto mb-3 text-gray-400 group-hover:text-yellow-500 transition-colors">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-300">Drop your packaging artwork here</p>
          <p className="text-xs text-gray-500 mt-1">or click to browse (JPG, PNG)</p>
        </div>
      )}
    </div>
  );
};