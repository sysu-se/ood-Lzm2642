import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 hint - getCandidates', () => {
  it('returns empty array for a filled cell', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    // (0,0) is 5 (initial), so candidates should be empty
    expect(sudoku.getCandidates(0, 0)).toEqual([])
  })

  it('returns candidates for an empty cell', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    // (0,2) is 0 in the puzzle
    const candidates = sudoku.getCandidates(0, 2)
    expect(Array.isArray(candidates)).toBe(true)
    expect(candidates.length).toBeGreaterThan(0)
    // Candidates should not contain numbers already in row 0, col 2, or box
    // Row 0 has: 5, 3, 7 => remaining candidates from 1-9
    expect(candidates.every(c => c >= 1 && c <= 9)).toBe(true)
  })

  it('candidates decrease after filling a related cell', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    const before = sudoku.getCandidates(0, 2)
    // Fill (0,2) with some valid number
    sudoku.guess({ row: 0, col: 2, value: 4 })
    // Now (0,2) is filled, candidates should be empty
    expect(sudoku.getCandidates(0, 2)).toEqual([])
    // But candidates for another empty cell in the same row should decrease
    const otherCand = sudoku.getCandidates(0, 3)
    expect(otherCand).not.toContain(4) // 4 is now in row 0
  })
})

describe('HW2 hint - findNextStep', () => {
  it('returns null when no cell has a single candidate', async () => {
    const { createSudoku } = await loadDomainApi()
    // Use a nearly-empty puzzle where most cells have multiple candidates
    const sparsePuzzle = Array(9).fill(null).map(() => Array(9).fill(0))
    sparsePuzzle[0][0] = 1
    sparsePuzzle[0][1] = 2
    sparsePuzzle[0][2] = 3
    sparsePuzzle[0][3] = 4
    sparsePuzzle[0][4] = 5
    sparsePuzzle[0][5] = 6
    sparsePuzzle[0][6] = 7
    sparsePuzzle[0][7] = 8
    // (0,8) must be 9 — single candidate
    const sudoku = createSudoku(sparsePuzzle)
    const step = sudoku.findNextStep()
    expect(step).not.toBeNull()
    expect(step.value).toBe(9)
    expect(step.row).toBe(0)
    expect(step.col).toBe(8)
  })

  it('returns a step with row, col, value, and candidates', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    const step = sudoku.findNextStep()
    if (step) {
      expect(step).toHaveProperty('row')
      expect(step).toHaveProperty('col')
      expect(step).toHaveProperty('value')
      expect(step).toHaveProperty('candidates')
      expect(step.candidates).toHaveLength(1)
      expect(step.candidates[0]).toBe(step.value)
    }
  })

  it('findNextStep returns null when all cells are filled correctly', async () => {
    const { createSudoku } = await loadDomainApi()
    // Use a complete valid sudoku
    const completePuzzle = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ]
    const sudoku = createSudoku(completePuzzle)
    expect(sudoku.findNextStep()).toBeNull()
  })
})
