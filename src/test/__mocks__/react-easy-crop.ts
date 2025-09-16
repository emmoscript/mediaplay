import { ReactElement } from 'react'

interface CropperProps {
  image: string
  crop: { x: number; y: number }
  zoom: number
  rotation: number
  onCropChange: (crop: { x: number; y: number }) => void
  onZoomChange: (zoom: number) => void
  onRotationChange: (rotation: number) => void
  onCropComplete: (croppedArea: any, croppedAreaPixels: any) => void
  classes?: { containerClassName: string }
}

const Cropper = ({ onCropComplete }: CropperProps): ReactElement => (
  <div 
    data-testid="cropper" 
    onClick={() => onCropComplete(
      { x: 0, y: 0, width: 100, height: 100 }, 
      { x: 0, y: 0, width: 100, height: 100 }
    )}
  >
    Mock Cropper
  </div>
)

export default Cropper
