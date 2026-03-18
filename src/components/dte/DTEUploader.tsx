'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOCR, type DTEData } from '@/hooks/useOCR';
import { DTEForm } from './DTEForm';

interface DTEUploaderProps {
  onSave?: (data: DTEData & { imagen_url?: string; ocr_raw_text?: string; ocr_confidence?: number }) => void;
}

export function DTEUploader({ onSave }: DTEUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<DTEData | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'success'>('upload');
  
  const { processImage, isProcessing, progress, error } = useOCR();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setStep('processing');

    const result = await processImage(selectedFile);
    
    if (result) {
      setExtractedData(result.extracted);
      setOcrText(result.ocr.text);
      setOcrConfidence(result.ocr.confidence);
      setStep('review');
    } else {
      setStep('upload');
    }
  }, [processImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const handleSave = (data: DTEData) => {
    onSave?.({
      ...data,
      ocr_raw_text: ocrText,
      ocr_confidence: ocrConfidence,
    });
    setStep('success');
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setExtractedData(null);
    setOcrText('');
    setOcrConfidence(0);
    setStep('upload');
  };

  // Upload step
  if (step === 'upload') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive 
              ? 'border-amber-500 bg-amber-500/10' 
              : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-lg font-medium text-white mb-2">
            {isDragActive ? 'Soltá la imagen aquí' : 'Arrastrá tu DT-e o hacé clic'}
          </p>
          <p className="text-sm text-gray-400">
            Formatos: JPG, PNG, WEBP, PDF
          </p>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Processing step
  if (step === 'processing') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
          {preview && (
            <div className="mb-6 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={preview} 
                alt="DT-e preview" 
                className="max-h-48 mx-auto rounded-lg opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
              </div>
            </div>
          )}
          <p className="text-lg font-medium text-white mb-2">
            Extrayendo datos...
          </p>
          <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400">{progress}%</p>
        </div>
      </div>
    );
  }

  // Review step
  if (step === 'review' && extractedData) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Image preview */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileImage className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400">{file?.name}</span>
              </div>
              <span className={`
                text-xs px-2 py-1 rounded-full
                ${ocrConfidence > 80 
                  ? 'bg-green-500/20 text-green-400' 
                  : ocrConfidence > 60 
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }
              `}>
                {Math.round(ocrConfidence)}% confianza
              </span>
            </div>
            {preview && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={preview} 
                alt="DT-e" 
                className="w-full rounded-lg"
              />
            )}
          </div>

          {/* Form */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Confirmá los datos
            </h3>
            <DTEForm 
              initialData={extractedData} 
              onSubmit={handleSave}
              onCancel={handleReset}
            />
          </div>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-gray-900/50 border border-green-500/30 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-semibold text-white mb-2">
            ¡Guía guardada!
          </h3>
          <p className="text-gray-400 mb-6">
            Tu DT-e fue agregado a tu historial.
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
          >
            Subir otra guía
          </button>
        </div>
      </div>
    );
  }

  return null;
}
