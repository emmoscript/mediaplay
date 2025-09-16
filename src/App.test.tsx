import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

// Mock react-easy-crop
vi.mock('react-easy-crop', () => ({
  default: ({ onCropComplete }: any) => (
    <div data-testid="cropper" onClick={() => onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 100, height: 100 })}>
      Mock Cropper
    </div>
  )
}))

// Mock URL methods
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url')
})

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn()
})

// Mock canvas methods
HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob(['mock'], { type: 'image/png' }))
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

describe('PromoStudio App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the main interface', () => {
      render(<App />)
      
      expect(screen.getByText('PromoStudio')).toBeInTheDocument()
      expect(screen.getByText('Diseñador')).toBeInTheDocument()
      expect(screen.getByText('Programación')).toBeInTheDocument()
      expect(screen.getByText('Diseña publicaciones promocionales rápidas: sube una imagen, recórtala, aplica un estilo y exporta. Usa comandos de voz simulados ("programar publicación"), escucha un sonido de confirmación y visualiza una intro 3D.')).toBeInTheDocument()
    })

    it('shows initial feedback message', () => {
      render(<App />)
      expect(screen.getByText('Bienvenido a PromoStudio')).toBeInTheDocument()
    })

    it('displays event counter', () => {
      render(<App />)
      expect(screen.getByText('Eventos: 0')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('allows switching between tabs', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      // Should start on Designer
      expect(screen.getByText('Editor de foto')).toBeInTheDocument()
      
      // Switch to Scheduler
      await user.click(screen.getByText('Programación'))
      expect(screen.getByText('Publicaciones programadas.')).toBeInTheDocument()
      expect(screen.getByText('No hay publicaciones programadas todavía.')).toBeInTheDocument()
      
      // Switch back to Designer
      await user.click(screen.getByText('Diseñador'))
      expect(screen.getByText('Editor de foto')).toBeInTheDocument()
    })
  })

  describe('Post Scheduling', () => {
    it('allows scheduling a post with title, description and date', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      // Fill in the form
      const titleInput = screen.getByPlaceholderText('Título de la publicación')
      const descriptionInput = screen.getByPlaceholderText('Añade una descripción')
      const dateInput = screen.getByLabelText('Fecha y hora de programación')
      
      await user.type(titleInput, 'Test Post')
      await user.type(descriptionInput, 'This is a test description')
      
      // Set a future date
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const dateString = futureDate.toISOString().slice(0, 16)
      await user.clear(dateInput)
      await user.type(dateInput, dateString)
      
      // Submit the form
      const saveButton = screen.getByText('Guardar publicación programada')
      await user.click(saveButton)
      
      // Should show success feedback
      expect(screen.getByText(/publicación guardada y programada/i)).toBeInTheDocument()
      
      // Switch to Scheduler to verify the post was created
      await user.click(screen.getByText('Programación'))
      
      expect(screen.getByText(/Test Post/)).toBeInTheDocument()
      expect(screen.getByText('This is a test description')).toBeInTheDocument()
      expect(screen.getByText('Programada')).toBeInTheDocument()
    })

    it('handles empty title by using default', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      // Leave title empty, fill description
      const descriptionInput = screen.getByPlaceholderText('Añade una descripción')
      const dateInput = screen.getByLabelText('Fecha y hora de programación')
      
      await user.type(descriptionInput, 'Test description')
      
      // Set a future date
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const dateString = futureDate.toISOString().slice(0, 16)
      await user.clear(dateInput)
      await user.type(dateInput, dateString)
      
      // Submit
      const saveButton = screen.getByText('Guardar publicación programada')
      await user.click(saveButton)
      
      // Switch to Scheduler
      await user.click(screen.getByText('Programación'))
      
      // Should use default title
      expect(screen.getByText('Publicación programada')).toBeInTheDocument()
    })
  })

  describe('Logs and Events', () => {
    it('allows downloading logs', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      // Click download button
      const downloadButton = screen.getByText('Descargar métricas')
      await user.click(downloadButton)
      
      // Should create and click anchor
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(mockAnchor.download).toMatch(/promostudio_log_.*\.json/)
    })

    it('tracks events and shows count', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      // Initial event count should be 0
      expect(screen.getByText('Eventos: 0')).toBeInTheDocument()
      
      // Upload an image to generate events
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      await user.upload(input, file)
      
      // Event count should increase
      await waitFor(() => {
        expect(screen.getByText(/Eventos: \d+/)).toBeInTheDocument()
      })
    })

    it('shows recent events in footer', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      // Upload an image to generate events
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /subir imagen/i }).nextElementSibling as HTMLInputElement
      await user.upload(input, file)
      
      // Should show recent events in footer
      await waitFor(() => {
        const footer = screen.getByText(/Feedback:/).closest('footer')
        expect(footer).toHaveTextContent(/photo_upload/)
      })
    })
  })
})