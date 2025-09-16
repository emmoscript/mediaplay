import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Cropper from 'react-easy-crop';

type CropArea = { x: number; y: number; width: number; height: number };

type PhotoEditorProps = {
  onFeedback: (msg: string, type: string, meta?: Record<string, unknown>) => void;
  log: (type: string, meta?: Record<string, unknown>) => void;
};

const FILTERS = [
  { key: 'none', label: 'Sin filtro', css: 'none' },
  { key: 'grayscale', label: 'Blanco y negro', css: 'grayscale(1)' },
  { key: 'sepia', label: 'Sepia', css: 'sepia(0.8)' },
  { key: 'contrast', label: 'Contraste', css: 'contrast(1.4)' },
  { key: 'bright', label: 'Brillo', css: 'brightness(1.2)' },
];

export default function PhotoEditor({ onFeedback, log }: PhotoEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [filter, setFilter] = useState<string>('none');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onSelectFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setFilter('none');
      onFeedback('Imagen cargada', 'photo_upload', { name: file.name, size: file.size });
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_croppedArea: CropArea, pixels: CropArea) => {
    setCroppedAreaPixels(pixels);
    log('crop_change', { pixels });
  }, [log]);

  const filterCss = useMemo(() => FILTERS.find(f => f.key === filter)?.css ?? 'none', [filter]);

  const createImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.src = url;
  });

  const getCroppedImg = async (imageSrcLocal: string, cropPixels: CropArea, rotationDeg: number, cssFilter: string) => {
    const image = await createImage(imageSrcLocal);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const safeArea = Math.max(image.width, image.height) * 2;
    canvas.width = cropPixels.width;
    canvas.height = cropPixels.height;

    // Apply rotation and filter
    ctx.filter = cssFilter;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw the image so that the crop aligns
    ctx.drawImage(
      image,
      cropPixels.x,
      cropPixels.y,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      cropPixels.width,
      cropPixels.height
    );

    return new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob as Blob), 'image/png'));
  };

  const onExport = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, filterCss);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mediaplay_edited.png';
      a.click();
      URL.revokeObjectURL(url);
      onFeedback('Edición exportada', 'photo_exported');
    } catch (e) {
      onFeedback('Error al exportar', 'photo_export_error', { error: String(e) });
    }
  };

  const onApplyCropPreview = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, filterCss);
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      onFeedback('Vista previa generada', 'photo_preview_ready');
    } catch (e) {
      onFeedback('Error al generar vista previa', 'photo_preview_error', { error: String(e) });
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4" aria-labelledby="photo-edit-title">
      <div className="flex items-center justify-between mb-2">
        <h2 id="photo-edit-title" className="font-medium">Editor de foto</h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
            onClick={() => inputRef.current?.click()}
          >
            Subir imagen
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onSelectFile}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="relative aspect-video w-full bg-gray-200 rounded overflow-hidden">
            {imageSrc ? (
              <div className="absolute inset-0" style={{ filter: filterCss }}>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                  classes={{ containerClassName: 'absolute inset-0' }}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">Sin imagen</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm text-gray-700">Zoom: {zoom.toFixed(2)}</label>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />

          <label className="text-sm text-gray-700">Rotación: {rotation}°</label>
          <input type="range" min={-180} max={180} step={1} value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} />

          <label className="text-sm text-gray-700">Filtro</label>
          <select
            className="border rounded px-2 py-1"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); onFeedback('Filtro aplicado', 'filter_change', { filter: e.target.value }); }}
          >
            {FILTERS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>

          <button
            className="mt-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            onClick={onApplyCropPreview}
            disabled={!imageSrc || !croppedAreaPixels}
          >
            Aplicar recorte
          </button>

          <button
            className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
            onClick={onExport}
            disabled={!imageSrc || !croppedAreaPixels}
          >
            Exportar PNG
          </button>
          {previewUrl && (
            <div className="mt-3">
              <div className="text-sm text-gray-700 mb-1">Vista previa:</div>
              <img src={previewUrl} alt="Vista previa" className="w-full rounded border" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


