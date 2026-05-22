import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { MATRIX_ROW_DEFS, type MatrixCellState } from '@/lib/onboardingMatrix'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

const allowedStates: MatrixCellState[] = ['ok', 'na', 'warn', 'missing']
const ROW_LABEL_KEY = '__rowLabel'
const ROW_NOTE_KEY = '__rowNote'
const allowedRowLabelColors = ['gray', 'red', 'orange', 'amber', 'yellow', 'green', 'teal', 'sky', 'blue', 'purple'] as const

function isAllowedState(s: unknown): s is MatrixCellState {
  return typeof s === 'string' && (allowedStates as readonly string[]).includes(s)
}

/** Set or clear one document-matrix cell override for a `matrix_manual` tracking row. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

    const admin = await prisma.admin.findUnique({ where: { email } })
    const role = String((admin as any)?.role || '').toUpperCase()
    if (!admin?.isActive || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    const body = await request.json().catch(() => ({}))
    const trackingId = typeof body.trackingId === 'string' ? body.trackingId.trim() : ''
    const columnId = typeof body.columnId === 'string' ? body.columnId.trim() : ''
    const cell = body.cell
    const isRowLabelUpdate = Object.prototype.hasOwnProperty.call(body, 'rowLabelColor')
    const isRowNoteUpdate = Object.prototype.hasOwnProperty.call(body, 'rowNote')
    const rowLabelColor =
      typeof body.rowLabelColor === 'string' ? body.rowLabelColor.trim().toLowerCase() : body.rowLabelColor
    const rowNote = typeof body.rowNote === 'string' ? body.rowNote.trim() : body.rowNote

    if (!trackingId || (!isRowLabelUpdate && !isRowNoteUpdate && !columnId)) {
      return NextResponse.json(
        { error: isRowLabelUpdate || isRowNoteUpdate ? 'trackingId is required' : 'trackingId and columnId are required' },
        { status: 400, headers: noStoreHeaders }
      )
    }

    if (!isRowLabelUpdate && !isRowNoteUpdate && columnId !== 'onboard' && !MATRIX_ROW_DEFS.some((d) => d.id === columnId)) {
      return NextResponse.json({ error: 'Invalid columnId' }, { status: 400, headers: noStoreHeaders })
    }

    if (
      isRowLabelUpdate &&
      rowLabelColor !== null &&
      rowLabelColor !== 'none' &&
      !(typeof rowLabelColor === 'string' && (allowedRowLabelColors as readonly string[]).includes(rowLabelColor))
    ) {
      return NextResponse.json({ error: 'Invalid rowLabelColor' }, { status: 400, headers: noStoreHeaders })
    }

    if (isRowNoteUpdate && rowNote !== null && typeof rowNote !== 'string') {
      return NextResponse.json({ error: 'Invalid rowNote' }, { status: 400, headers: noStoreHeaders })
    }

    if (!isRowLabelUpdate && !isRowNoteUpdate && cell !== null && (typeof cell !== 'object' || cell === null)) {
      return NextResponse.json({ error: 'cell must be null or an object' }, { status: 400, headers: noStoreHeaders })
    }

    if (!isRowLabelUpdate && !isRowNoteUpdate && cell !== null) {
      if (!isAllowedState((cell as { state?: unknown }).state)) {
        return NextResponse.json({ error: 'Invalid cell.state' }, { status: 400, headers: noStoreHeaders })
      }
      const detail = (cell as { detail?: unknown }).detail
      const items = (cell as { items?: unknown }).items
      if (detail !== undefined && detail !== null && typeof detail !== 'string') {
        return NextResponse.json({ error: 'Invalid cell.detail' }, { status: 400, headers: noStoreHeaders })
      }
      if (
        items !== undefined &&
        (!Array.isArray(items) || !items.every((item) => isAllowedState(item)))
      ) {
        return NextResponse.json({ error: 'Invalid cell.items' }, { status: 400, headers: noStoreHeaders })
      }
    }

    const row = await prisma.installerTracking.findFirst({
      where: { id: trackingId, type: 'matrix_manual' },
      select: { id: true, matrixCellOverrides: true },
    })

    if (!row) {
      return NextResponse.json({ error: 'Matrix row not found' }, { status: 404, headers: noStoreHeaders })
    }

    const prev =
      row.matrixCellOverrides &&
      typeof row.matrixCellOverrides === 'object' &&
      !Array.isArray(row.matrixCellOverrides)
        ? ({ ...(row.matrixCellOverrides as Record<string, unknown>) } as Record<string, unknown>)
        : ({} as Record<string, unknown>)

    if (isRowLabelUpdate) {
      if (rowLabelColor === null || rowLabelColor === 'none') {
        delete prev[ROW_LABEL_KEY]
      } else {
        prev[ROW_LABEL_KEY] = { color: rowLabelColor }
      }
    } else if (isRowNoteUpdate) {
      if (rowNote === null || rowNote === '') {
        delete prev[ROW_NOTE_KEY]
      } else {
        prev[ROW_NOTE_KEY] = { text: rowNote }
      }
    } else if (cell === null) {
      delete prev[columnId]
    } else {
      const c = cell as { state: MatrixCellState; detail?: string; items?: MatrixCellState[] }
      const detailTrim = typeof c.detail === 'string' ? c.detail.trim() : ''
      prev[columnId] = {
        state: c.state,
        ...(detailTrim ? { detail: detailTrim } : {}),
        ...(Array.isArray(c.items) ? { items: c.items } : {}),
      }
    }

    // Plain JSON only (avoids driver / JsonNull quirks). Empty {} means "no overrides".
    const nextJson = JSON.parse(JSON.stringify(prev)) as Prisma.InputJsonValue

    await prisma.installerTracking.update({
      where: { id: trackingId },
      data: { matrixCellOverrides: nextJson },
    })

    return NextResponse.json({ success: true }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('onboarding-matrix cell POST:', error)
    const details =
      typeof error?.message === 'string'
        ? error.message
        : error != null
          ? String(error)
          : 'Unknown error'
    const hint =
      /matrixCellOverrides|column .+ does not exist|P2022|Unknown column/i.test(details)
        ? ' Run database migrations: npx prisma migrate deploy (or add column matrixCellOverrides to InstallerTracking).'
        : ''
    return NextResponse.json(
      { error: 'Failed to update matrix cell', details: details + hint },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
