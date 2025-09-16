import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'

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

describe('Complete User Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('completes full workflow: upload → edit → schedule → view', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Step 1: Upload an image
    const file = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' })
    const uploadButton = screen.getByRole('button', { name: /subir imagen/i })
    const fileInput = uploadButton.nextElementSibling as HTMLInputElement
    
    await user.upload(fileInput, file)
    
    // Verify image is loaded
    await waitFor(() => {
      expect(screen.getByTestId('cropper')).toBeInTheDocument()
    })
    expect(screen.getByText(/imagen cargada/i)).toBeInTheDocument()

    // Step 2: Edit the image (apply crop)
    const cropper = screen.getByTestId('cropper')
    await user.click(cropper)
    
    const applyCropButton = screen.getByText('Aplicar recorte')
    await user.click(applyCropButton)
    
    await waitFor(() => {
      expect(screen.getByText(/vista previa generada/i)).toBeInTheDocument()
    })

    // Step 3: Fill in post details
    const titleInput = screen.getByPlaceholderText('Título de la publicación')
    const descriptionInput = screen.getByPlaceholderText('Añade una descripción')
    const dateInput = screen.getByLabelText('Fecha y hora de programación')
    
    await user.type(titleInput, 'Mi primera publicación')
    await user.type(descriptionInput, 'Esta es una descripción de prueba para mi publicación')
    
    // Set future date
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    const dateString = futureDate.toISOString().slice(0, 16)
    await user.clear(dateInput)
    await user.type(dateInput, dateString)

    // Step 4: Save the post
    const saveButton = screen.getByText('Guardar publicación programada')
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText(/publicación guardada y programada/i)).toBeInTheDocument()
    })

    // Step 5: View scheduled posts
    await user.click(screen.getByText('Programación'))
    
    expect(screen.getByText('Mi primera publicación')).toBeInTheDocument()
    expect(screen.getByText('Esta es una descripción de prueba para mi publicación')).toBeInTheDocument()
    expect(screen.getByText('Programada')).toBeInTheDocument()

    // Step 6: Download logs
    await user.click(screen.getByText('Diseñador'))
    const downloadButton = screen.getByText('Descargar métricas')
    await user.click(downloadButton)
    
    expect(mockAnchor.click).toHaveBeenCalled()
    expect(mockAnchor.download).toMatch(/promostudio_log_.*\.json/)
  })

  it('handles multiple posts workflow', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Create first post
    const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' })
    const uploadButton = screen.getByRole('button', { name: /subir imagen/i })
    const fileInput = uploadButton.nextElementSibling as HTMLInputElement
    
    await user.upload(fileInput, file1)
    await waitFor(() => expect(screen.getByTestId('cropper')).toBeInTheDocument())
    
    const cropper = screen.getByTestId('cropper')
    await user.click(cropper)
    
    const titleInput = screen.getByPlaceholderText('Título de la publicación')
    const descriptionInput = screen.getByPlaceholderText('Añade una descripción')
    const dateInput = screen.getByLabelText('Fecha y hora de programación')
    
    await user.type(titleInput, 'Primera publicación')
    await user.type(descriptionInput, 'Descripción 1')
    
    const futureDate1 = new Date()
    futureDate1.setDate(futureDate1.getDate() + 1)
    const dateString1 = futureDate1.toISOString().slice(0, 16)
    await user.clear(dateInput)
    await user.type(dateInput, dateString1)
    
    await user.click(screen.getByText('Guardar publicación programada'))
    await waitFor(() => expect(screen.getByText(/publicación guardada y programada/i)).toBeInTheDocument())

    // Create second post
    await user.type(titleInput, 'Segunda publicación')
    await user.type(descriptionInput, 'Descripción 2')
    
    const futureDate2 = new Date()
    futureDate2.setDate(futureDate2.getDate() + 2)
    const dateString2 = futureDate2.toISOString().slice(0, 16)
    await user.clear(dateInput)
    await user.type(dateInput, dateString2)
    
    await user.click(screen.getByText('Guardar publicación programada'))
    await waitFor(() => expect(screen.getByText(/publicación guardada y programada/i)).toBeInTheDocument())

    // View all posts
    await user.click(screen.getByText('Programación'))
    
    expect(screen.getByText('Primera publicación')).toBeInTheDocument()
    expect(screen.getByText('Segunda publicación')).toBeInTheDocument()
    expect(screen.getAllByText('Programada')).toHaveLength(2)
  })

  it('handles error states gracefully', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Try to export without image
    const exportButton = screen.getByText('Exportar PNG')
    expect(exportButton).toBeDisabled()

    // Try to apply crop without image
    const applyCropButton = screen.getByText('Aplicar recorte')
    expect(applyCropButton).toBeDisabled()

    // Upload image and try operations
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const uploadButton = screen.getByRole('button', { name: /subir imagen/i })
    const fileInput = uploadButton.nextElementSibling as HTMLInputElement
    
    await user.upload(fileInput, file)
    await waitFor(() => expect(screen.getByTestId('cropper')).toBeInTheDocument())
    
    // Now buttons should be enabled after setting crop area
    const cropper = screen.getByTestId('cropper')
    await user.click(cropper)
    
    expect(exportButton).not.toBeDisabled()
    expect(applyCropButton).not.toBeDisabled()
  })
})
