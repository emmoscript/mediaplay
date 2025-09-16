import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PhotoEditor from './PhotoEditor'

// Mock react-easy-crop
vi.mock('react-easy-crop', () => ({
  default: ({ onCropComplete }: any) => (
    <div data-testid="cropper" onClick={() => onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 100, height: 100 })}>
      Mock Cropper
    </div>
  )
}))

// Mock canvas methods
HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob(['mock'], { type: 'image/png' }))
})

// Mock URL methods
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url')
})

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn()
})

// Mock document.createElement for anchor elements
const mockAnchor = {
  href: '',
  download: '',
  click: vi.fn()
}

const originalCreateElement = document.createElement
vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
  if (tagName === 'a') {
    return mockAnchor as any
  }
  return originalCreateElement.call(document, tagName)
})

describe('PhotoEditor', () => {
  const mockOnFeedback = vi.fn()
  const mockLog = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders upload button and controls', () => {
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      expect(screen.getByText('Editor de foto')).toBeInTheDocument()
      expect(screen.getByText('Subir imagen')).toBeInTheDocument()
      expect(screen.getByText('Sin imagen')).toBeInTheDocument()
    })

    it('shows initial zoom and rotation values', () => {
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      expect(screen.getByDisplayValue('1.00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('0')).toBeInTheDocument()
    })

    it('shows filter options', () => {
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      expect(screen.getByDisplayValue('Sin filtro')).toBeInTheDocument()
      expect(screen.getByText('Blanco y negro')).toBeInTheDocument()
      expect(screen.getByText('Sepia')).toBeInTheDocument()
    })
  })

  describe('File Upload', () => {
    it('handles file upload', async () => {
      const user = userEvent.setup()
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      
      await user.upload(input, file)
      
      expect(mockOnFeedback).toHaveBeenCalledWith('Imagen cargada', 'photo_upload', {
        name: 'test.jpg',
        size: 4
      })
      expect(mockLog).toHaveBeenCalledWith('photo_upload', {
        name: 'test.jpg',
        size: 4
      })
    })

    it('shows cropper when image is loaded', async () => {
      const user = userEvent.setup()
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      
      await user.upload(input, file)
      
      expect(screen.getByTestId('cropper')).toBeInTheDocument()
    })
  })

  describe('Controls', () => {
    it('handles zoom control', async () => {
      const user = userEvent.setup()
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      await user.upload(input, file)
      
      const zoomSlider = screen.getByDisplayValue('1.00')
      await user.type(zoomSlider, '2.50')
      
      expect(zoomSlider).toHaveValue(2.5)
    })

    it('handles rotation control', async () => {
      const user = userEvent.setup()
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      await user.upload(input, file)
      
      const rotationSlider = screen.getByDisplayValue('0')
      await user.type(rotationSlider, '45')
      
      expect(rotationSlider).toHaveValue(45)
    })

    it('handles filter selection', async () => {
      const user = userEvent.setup()
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      await user.upload(input, file)
      
      const filterSelect = screen.getByDisplayValue('Sin filtro')
      await user.selectOptions(filterSelect, 'grayscale')
      
      expect(filterSelect).toHaveValue('grayscale')
      expect(mockOnFeedback).toHaveBeenCalledWith('Filtro aplicado', 'filter_change', { filter: 'grayscale' })
    })
  })

  describe('Crop and Export', () => {
    it('handles crop completion', async () => {
      const user = userEvent.setup()
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      await user.upload(input, file)
      
      // Click on cropper to trigger onCropComplete
      const cropper = screen.getByTestId('cropper')
      await user.click(cropper)
      
      expect(mockLog).toHaveBeenCalledWith('crop_change', { pixels: { x: 0, y: 0, width: 100, height: 100 } })
    })

    it('disables export button when no image or crop area', () => {
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      const exportButton = screen.getByText('Exportar PNG')
      expect(exportButton).toBeDisabled()
    })

    it('enables export button when image and crop area are available', async () => {
      const user = userEvent.setup()
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      await user.upload(input, file)
      
      // Click on cropper to set crop area
      const cropper = screen.getByTestId('cropper')
      await user.click(cropper)
      
      const exportButton = screen.getByText('Exportar PNG')
      expect(exportButton).not.toBeDisabled()
    })

    it('handles export with success', async () => {
      const user = userEvent.setup()
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      await user.upload(input, file)
      
      // Click on cropper to set crop area
      const cropper = screen.getByTestId('cropper')
      await user.click(cropper)
      
      const exportButton = screen.getByText('Exportar PNG')
      await user.click(exportButton)
      
      expect(mockOnFeedback).toHaveBeenCalledWith('Edición exportada', 'photo_exported')
      expect(mockAnchor.click).toHaveBeenCalled()
    })

    it('handles preview generation', async () => {
      const user = userEvent.setup()
      render(<PhotoEditor onFeedback={mockOnFeedback} log={mockLog} />)
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      await user.upload(input, file)
      
      // Click on cropper to set crop area
      const cropper = screen.getByTestId('cropper')
      await user.click(cropper)
      
      const previewButton = screen.getByText('Aplicar recorte')
      await user.click(previewButton)
      
      expect(mockOnFeedback).toHaveBeenCalledWith('Vista previa generada', 'photo_preview_ready')
    })
  })
})