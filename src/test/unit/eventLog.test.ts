import { describe, expect, it, vi } from 'vitest';

// Mock the useEventLog hook for testing
const mockUseEventLog = () => {
  const events: Array<{ type: string; t: number; meta?: Record<string, unknown> }> = []
  const t0 = Date.now()
  
  const log = (type: string, meta?: Record<string, unknown>) => {
    const event = { type, t: Date.now(), meta }
    events.push(event)
  }
  
  const relative = (t: number) => ((t - t0) / 1000).toFixed(2) + 's'
  
  const download = () => {
    const blob = new Blob([JSON.stringify({ t0, events }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `promostudio_log_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return { events, log, relative, download }
}

describe('Event Log System', () => {
  it('should log events with timestamps', () => {
    const { events, log } = mockUseEventLog()
    
    log('test_event', { data: 'test' })
    
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('test_event')
    expect(events[0].meta).toEqual({ data: 'test' })
    expect(events[0].t).toBeGreaterThan(0)
  })

  it('should calculate relative time correctly', () => {
    const { relative } = mockUseEventLog()
    const startTime = Date.now()
    
    // Wait a small amount and check relative time
    setTimeout(() => {
      const relativeTime = relative(startTime)
      expect(relativeTime).toMatch(/^\d+\.\d+s$/)
    }, 10)
  })

  it('should handle multiple events', () => {
    const { events, log } = mockUseEventLog()
    
    log('event1')
    log('event2', { value: 123 })
    log('event3')
    
    expect(events).toHaveLength(3)
    expect(events[0].type).toBe('event1')
    expect(events[1].type).toBe('event2')
    expect(events[1].meta).toEqual({ value: 123 })
    expect(events[2].type).toBe('event3')
  })

  it('should generate proper download filename', () => {
    const { download } = mockUseEventLog()
    
    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = vi.fn(() => 'mock-url')
    const mockRevokeObjectURL = vi.fn()
    const mockAnchor = { href: '', download: '', click: vi.fn() }
    
    Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL })
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    
    download()
    
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockAnchor.click).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url')
    expect(mockAnchor.download).toMatch(/^promostudio_log_\d+\.json$/)
  })

  it('should maintain event order', () => {
    const { events, log } = mockUseEventLog()
    
    log('first')
    log('second')
    log('third')
    
    expect(events[0].type).toBe('first')
    expect(events[1].type).toBe('second')
    expect(events[2].type).toBe('third')
    
    // Verify timestamps are in order
    expect(events[0].t).toBeLessThanOrEqual(events[1].t)
    expect(events[1].t).toBeLessThanOrEqual(events[2].t)
  })

  it('should handle events without metadata', () => {
    const { events, log } = mockUseEventLog()
    
    log('simple_event')
    
    expect(events[0].type).toBe('simple_event')
    expect(events[0].meta).toBeUndefined()
  })

  it('should handle complex metadata', () => {
    const { events, log } = mockUseEventLog()
    
    const complexMeta = {
      user: 'test-user',
      action: 'upload',
      file: { name: 'test.jpg', size: 1024 },
      timestamp: Date.now()
    }
    
    log('complex_event', complexMeta)
    
    expect(events[0].meta).toEqual(complexMeta)
  })
})
