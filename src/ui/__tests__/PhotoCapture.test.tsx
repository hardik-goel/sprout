// The live preview is the happy path, but the fallback is the one that has to
// be bulletproof: a denied permission, a desktop with no camera, or an insecure
// origin must still leave the parent a way to attach a photo.

import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoCapture } from '../PhotoCapture'

const originalMediaDevices = navigator.mediaDevices

function setMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  setMediaDevices(originalMediaDevices)
  vi.restoreAllMocks()
})

describe('PhotoCapture', () => {
  it('falls straight through to the file input when there is no camera', async () => {
    const user = userEvent.setup()
    setMediaDevices(undefined)
    render(<PhotoCapture value={null} onChange={() => {}} />)

    const input = screen.getByTestId('photo-file-input') as HTMLInputElement
    const click = vi.spyOn(input, 'click')

    // With no camera there is one button, and it opens the picker directly —
    // no "camera unavailable" dead end to read past first.
    await user.click(screen.getByRole('button'))
    expect(click).toHaveBeenCalled()
    expect(screen.queryByText(/Choose a photo/)).toBeNull()
  })

  it('offers the picker alongside the camera when both are possible', () => {
    setMediaDevices({ getUserMedia: vi.fn() })
    render(<PhotoCapture value={null} onChange={() => {}} />)

    expect(screen.getByText(/Take or pick a photo/)).toBeInTheDocument()
    // The picker is a peer of the camera, never hidden behind a failure.
    expect(screen.getByText(/Choose a photo/)).toBeInTheDocument()
  })

  it('explains a denied camera without removing the way forward', async () => {
    const user = userEvent.setup()
    setMediaDevices({ getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) })
    render(<PhotoCapture value={null} onChange={() => {}} />)

    await user.click(screen.getByText(/Take or pick a photo/))

    await waitFor(() => expect(screen.getByText(/pick a photo instead/i)).toBeInTheDocument())
    expect(screen.getByText(/Choose a photo/)).toBeInTheDocument()
  })

  it('stops every camera track when it unmounts, so the light goes off', async () => {
    const user = userEvent.setup()
    const stop = vi.fn()
    const stream = { getTracks: () => [{ stop }] }
    setMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(stream) })

    const { unmount } = render(<PhotoCapture value={null} onChange={() => {}} />)
    await user.click(screen.getByText(/Take or pick a photo/))
    await waitFor(() => expect(screen.getByLabelText(/Flip camera/)).toBeInTheDocument())

    unmount()
    expect(stop).toHaveBeenCalled()
  })

  it('shows a retake and a re-pick once a photo exists', () => {
    setMediaDevices({ getUserMedia: vi.fn() })
    render(<PhotoCapture value="data:image/jpeg;base64,AAAA" onChange={() => {}} />)

    expect(screen.getByAltText(/Task proof/)).toBeInTheDocument()
    expect(screen.getByText(/Retake/)).toBeInTheDocument()
    expect(screen.getByText(/Choose a photo/)).toBeInTheDocument()
  })
})
