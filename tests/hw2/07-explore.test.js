import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 explore - enter/commit/abort', () => {
  it('can enter explore mode', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    expect(game.isInExplore()).toBe(false)
    const ok = game.enterExplore()
    expect(ok).toBe(true)
    expect(game.isInExplore()).toBe(true)
  })

  it('cannot enter explore twice', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    game.enterExplore()
    const ok = game.enterExplore()
    expect(ok).toBe(false)
  })

  it('can commit explore and changes merge into main history', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    const initialGrid = game.getSudoku().getGrid()
    const baseHistoryIndex = game.getHistoryIndex()

    game.enterExplore()
    game.exploreGuess({ row: 0, col: 2, value: 4 })

    const ok = game.commitExplore()
    expect(ok).toBe(true)
    expect(game.isInExplore()).toBe(false)

    // The committed change should be reflected
    expect(game.getSudoku().getGrid()[0][2]).toBe(4)

    // History should have been extended
    expect(game.getHistoryIndex()).toBe(baseHistoryIndex + 1)
  })

  it('can abort explore and changes are discarded', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    const baseHistoryIndex = game.getHistoryIndex()

    game.enterExplore()
    game.exploreGuess({ row: 0, col: 2, value: 4 })

    const ok = game.abortExplore()
    expect(ok).toBe(true)
    expect(game.isInExplore()).toBe(false)

    // The change should be discarded
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)

    // History should be back to where it was
    expect(game.getHistoryIndex()).toBe(baseHistoryIndex)
  })
})

describe('HW2 explore - undo and reset', () => {
  it('can undo in explore mode', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.exploreGuess({ row: 0, col: 2, value: 4 })
    expect(game.getSudoku().getGrid()[0][2]).toBe(4)

    const ok = game.exploreUndo()
    expect(ok).toBe(true)
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
  })

  it('cannot undo below explore start', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    const ok = game.exploreUndo()
    expect(ok).toBe(false)
  })

  it('can reset to explore start', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.exploreGuess({ row: 0, col: 2, value: 4 })
    game.exploreGuess({ row: 1, col: 1, value: 7 })

    const ok = game.exploreResetToStart()
    expect(ok).toBe(true)
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
    expect(game.getSudoku().getGrid()[1][1]).toBe(0)
  })
})

describe('HW2 explore - conflict detection', () => {
  it('detects conflict when wrong number is filled', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    // Row 0 already has 5, try putting another 5 in (0,2)
    const res = game.exploreGuess({ row: 0, col: 2, value: 5 })
    expect(res.success).toBe(true)
    expect(res.conflict).toBe(true)
  })

  it('no conflict for correct number', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    const res = game.exploreGuess({ row: 0, col: 2, value: 4 })
    expect(res.success).toBe(true)
    expect(res.conflict).toBe(false)
  })
})

describe('HW2 explore - tried path memory', () => {
  it('remembers a failed path and reports when revisited', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    // Cause a conflict
    game.exploreGuess({ row: 0, col: 2, value: 5 }) // conflict
    // Undo
    game.exploreUndo()
    // Try the same conflict again
    const res = game.exploreGuess({ row: 0, col: 2, value: 5 })
    expect(res.conflict).toBe(true)
    // The tried path should be detected
    expect(res.triedPath).toBe(true)
  })
})

describe('HW2 explore - main history preserved', () => {
  it('undo/redo still works after abort explore', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    // Make a normal move first
    game.guess({ row: 0, col: 2, value: 4 })
    expect(game.canUndo()).toBe(true)

    // Enter and abort explore
    game.enterExplore()
    game.exploreGuess({ row: 1, col: 1, value: 7 })
    game.abortExplore()

    // Normal undo should still work
    expect(game.canUndo()).toBe(true)
    game.undo()
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
  })

  it('undo/redo still works after commit explore', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    // Make a normal move first
    game.guess({ row: 0, col: 2, value: 4 })

    // Enter and commit explore
    game.enterExplore()
    game.exploreGuess({ row: 1, col: 1, value: 7 })
    game.commitExplore()

    // Can undo back through committed steps
    expect(game.canUndo()).toBe(true)
    game.undo()
    // The committed explore step should be undone
    expect(game.getSudoku().getGrid()[1][1]).toBe(0)

    // Can undo the original normal move too
    game.undo()
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)

    // Can redo
    expect(game.canRedo()).toBe(true)
  })
})
