import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Mock react-easy-crop to avoid canvas issues in tests
jest.mock('react-easy-crop', () => ({
  default: ({ onCropComplete }: any) => (
    <div data-testid="cropper" onClick={() => onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 100, height: 100 })}>
      Mock Cropper
    </div>
  )
}))

// Mock URL methods
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'mock-url')
})

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn()
})

// Mock canvas methods
HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
  callback(new Blob(['mock'], { type: 'image/png' }))
})

// Mock document.createElement for anchor elements
const mockAnchor = {
  href: '',
  download: '',
  click: jest.fn()
}

const originalCreateElement = document.createElement
document.createElement = jest.fn((tagName) => {
  if (tagName === 'a') {
    return mockAnchor as any
  }
  return originalCreateElement.call(document, tagName)
})

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Test utilities
export const createMockFile = (name: string, type: string, content: string = 'test') => {
  return new File([content], name, { type })
}

export const mockEventLog = () => ({
  events: [],
  log: jest.fn(),
  relative: jest.fn((t: number) => '0.00s'),
  download: jest.fn()
})

export const mockFeedback = jest.fn()

// Clean up after each test
export const cleanupMocks = () => {
  jest.clearAllMocks()
  mockAnchor.href = ''
  mockAnchor.download = ''
  mockAnchor.click.mockClear()
}
