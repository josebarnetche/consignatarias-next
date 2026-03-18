import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';

interface OCRResult {
  text: string;
  confidence: number;
}

interface DTEData {
  numero_dte?: string;
  fecha_emision?: string;
  fecha_movimiento?: string;
  renspa_origen?: string;
  renspa_destino?: string;
  titular_origen?: string;
  titular_destino?: string;
  establecimiento_origen?: string;
  establecimiento_destino?: string;
  especie?: string;
  cantidad_cabezas?: number;
  categorias?: Record<string, number>;
  peso_total_kg?: number;
  motivo?: string;
}

// Regex patterns for DT-e fields
const patterns = {
  numero_dte: /DT-?e?\s*N[°o]?\s*:?\s*(\d{2}[-.]?\d{10,})/i,
  renspa: /RENSPA\s*:?\s*(\d{2}\.\d{3}\.\d\.\d{5}\/\d{2})/gi,
  fecha: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
  cabezas: /(?:cantidad|cabezas|total|animales)\s*:?\s*(\d+)/i,
  peso: /(?:peso\s*total|kg\s*total|total\s*kg)\s*:?\s*(\d+(?:[.,]\d+)?)/i,
  categorias: /(novillos?|novillitos?|vaquillonas?|vacas?|toros?|terneros?|terneras?|toritos?|vientres?)\s*:?\s*(\d+)/gi,
  especie: /(bovino|ovino|porcino|equino|caprino)/i,
  motivo: /(remate|faena|invernada|cr[ií]a|recr[ií]a|engorde|exposici[oó]n)/i,
};

function parseArgDate(dateStr: string): string | undefined {
  // Handle DD/MM/YYYY or DD-MM-YYYY
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return undefined;
  
  const [day, month] = parts;
  let year = parts[2];
  
  // Handle 2-digit year
  if (year.length === 2) {
    year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
  }
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function extractDTEData(rawText: string): DTEData {
  const data: DTEData = {};
  
  // Extract numero_dte
  const dteMatch = rawText.match(patterns.numero_dte);
  if (dteMatch) data.numero_dte = dteMatch[1].replace(/[.-]/g, '-');
  
  // Extract RENSPAs (first = origen, second = destino typically)
  const renspas = [...rawText.matchAll(patterns.renspa)];
  if (renspas[0]) data.renspa_origen = renspas[0][1];
  if (renspas[1]) data.renspa_destino = renspas[1][1];
  
  // Extract dates (first = emisión, second = movimiento typically)
  const fechas = [...rawText.matchAll(patterns.fecha)];
  if (fechas[0]) data.fecha_emision = parseArgDate(fechas[0][1]);
  if (fechas[1]) data.fecha_movimiento = parseArgDate(fechas[1][1]);
  
  // Extract cabezas
  const cabezasMatch = rawText.match(patterns.cabezas);
  if (cabezasMatch) data.cantidad_cabezas = parseInt(cabezasMatch[1]);
  
  // Extract peso
  const pesoMatch = rawText.match(patterns.peso);
  if (pesoMatch) data.peso_total_kg = parseInt(pesoMatch[1].replace(',', '.'));
  
  // Extract especie
  const especieMatch = rawText.match(patterns.especie);
  if (especieMatch) data.especie = especieMatch[1].toLowerCase();
  else data.especie = 'bovino'; // Default
  
  // Extract motivo
  const motivoMatch = rawText.match(patterns.motivo);
  if (motivoMatch) data.motivo = motivoMatch[1].toLowerCase();
  
  // Extract categorias
  const categorias: Record<string, number> = {};
  for (const match of rawText.matchAll(patterns.categorias)) {
    const categoria = match[1].toLowerCase();
    const cantidad = parseInt(match[2]);
    // Normalize category names
    const normalized = categoria
      .replace(/novillitos?/, 'novillitos')
      .replace(/novillos?/, 'novillos')
      .replace(/vaquillonas?/, 'vaquillonas')
      .replace(/vacas?/, 'vacas')
      .replace(/toros?/, 'toros')
      .replace(/terneros?/, 'terneros')
      .replace(/terneras?/, 'terneras')
      .replace(/toritos?/, 'toritos')
      .replace(/vientres?/, 'vientres');
    categorias[normalized] = (categorias[normalized] || 0) + cantidad;
  }
  if (Object.keys(categorias).length) data.categorias = categorias;
  
  return data;
}

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async (file: File): Promise<{
    ocr: OCRResult;
    extracted: DTEData;
  } | null> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const result = await Tesseract.recognize(file, 'spa', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const ocr: OCRResult = {
        text: result.data.text,
        confidence: result.data.confidence,
      };

      const extracted = extractDTEData(result.data.text);

      return { ocr, extracted };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error procesando imagen';
      setError(message);
      return null;
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, []);

  return {
    processImage,
    isProcessing,
    progress,
    error,
  };
}

export type { DTEData, OCRResult };
