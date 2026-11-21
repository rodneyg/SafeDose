import { act, renderHook } from "@testing-library/react-native"

import { reducer, useToast } from "./use-toast"

const firstToast = { id: "first", title: "First", open: true }
const secondToast = { id: "second", title: "Second", open: true }

describe("use-toast reducer", () => {
  it("adds the newest toast and enforces the one-toast limit", () => {
    const state = { toasts: [firstToast] }

    expect(
      reducer(state, { type: "ADD_TOAST", toast: secondToast })
    ).toEqual({ toasts: [secondToast] })
  })

  it("updates only the matching toast", () => {
    const state = { toasts: [firstToast, secondToast] }

    expect(
      reducer(state, {
        type: "UPDATE_TOAST",
        toast: { id: "second", title: "Updated", open: false },
      })
    ).toEqual({
      toasts: [firstToast, { ...secondToast, title: "Updated", open: false }],
    })
  })

  it("dismisses one toast or all toasts", () => {
    jest.useFakeTimers()
    const state = { toasts: [firstToast, secondToast] }

    expect(
      reducer(state, { type: "DISMISS_TOAST", toastId: "first" }).toasts
    ).toEqual([{ ...firstToast, open: false }, secondToast])
    expect(reducer(state, { type: "DISMISS_TOAST" }).toasts).toEqual([
      { ...firstToast, open: false },
      { ...secondToast, open: false },
    ])

    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("removes one toast or clears all toasts", () => {
    const state = { toasts: [firstToast, secondToast] }

    expect(
      reducer(state, { type: "REMOVE_TOAST", toastId: "first" })
    ).toEqual({ toasts: [secondToast] })
    expect(reducer(state, { type: "REMOVE_TOAST" })).toEqual({ toasts: [] })
  })
})

describe("useToast", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  it("creates, updates, dismisses, and eventually removes a toast", () => {
    const { result } = renderHook(() => useToast())
    let controls!: ReturnType<typeof result.current.toast>

    act(() => {
      controls = result.current.toast({ title: "Saved" })
    })
    expect(result.current.toasts).toMatchObject([
      { id: controls.id, title: "Saved", open: true },
    ])

    act(() => {
      controls.update({ id: "ignored", title: "Updated" })
    })
    expect(result.current.toasts[0]).toMatchObject({
      id: controls.id,
      title: "Updated",
      open: true,
    })

    act(() => {
      result.current.toasts[0].onOpenChange?.(false)
    })
    expect(result.current.toasts[0].open).toBe(false)

    act(() => {
      jest.runOnlyPendingTimers()
    })
    expect(result.current.toasts).toEqual([])
  })

  it("replaces an existing toast and supports dismissing all", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: "Old" })
      result.current.toast({ title: "New" })
    })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].title).toBe("New")

    act(() => {
      result.current.dismiss()
    })
    expect(result.current.toasts[0].open).toBe(false)
  })
})
