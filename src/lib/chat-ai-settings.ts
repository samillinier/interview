import { Prisma } from '@prisma/client'
import prisma from '@/lib/db'

export const CHAT_AI_SETTING_KEY = 'chatAiEnabled'

async function flagsById(
  ids: string[],
  query: (ids: string[]) => Promise<Array<{ id: string; enabled: boolean | null }>>,
) {
  const flags = new Map<string, boolean>()
  if (!ids.length) return flags
  try {
    const rows = await query(ids)
    for (const row of rows) flags.set(row.id, row.enabled !== false)
  } catch (error) {
    console.error('Failed to load chat AI flags', error)
  }
  return flags
}

export async function isChatAiGloballyEnabled() {
  try {
    const rows = await prisma.$queryRaw<Array<{ value: string }>>`
      SELECT "value" FROM "AppSetting" WHERE "key" = ${CHAT_AI_SETTING_KEY} LIMIT 1
    `
    if (!rows[0]) return true
    return rows[0].value !== 'false'
  } catch {
    try {
      const row = await prisma.appSetting.findUnique({
        where: { key: CHAT_AI_SETTING_KEY },
        select: { value: true },
      })
      if (!row) return true
      return row.value !== 'false'
    } catch {
      return true
    }
  }
}

export async function setChatAiGloballyEnabled(enabled: boolean) {
  const value = enabled ? 'true' : 'false'
  try {
    await prisma.$executeRaw`
      INSERT INTO "AppSetting" ("key", "value", "updatedAt")
      VALUES (${CHAT_AI_SETTING_KEY}, ${value}, NOW())
      ON CONFLICT ("key")
      DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()
    `
    return enabled
  } catch (rawError) {
    try {
      await prisma.appSetting.upsert({
        where: { key: CHAT_AI_SETTING_KEY },
        create: { key: CHAT_AI_SETTING_KEY, value },
        update: { value },
      })
      return enabled
    } catch (error) {
      console.error('Failed to save chat AI setting', rawError, error)
      throw error
    }
  }
}

export async function isWebsiteChatAiEnabled(chatId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ aiEnabled: boolean | null }>>`
      SELECT "aiEnabled" FROM "WebsiteChat" WHERE id = ${chatId} LIMIT 1
    `
    return rows[0]?.aiEnabled !== false
  } catch {
    return true
  }
}

export async function setWebsiteChatAiEnabled(chatId: string, enabled: boolean) {
  const updated = await prisma.$executeRaw`
    UPDATE "WebsiteChat" SET "aiEnabled" = ${enabled} WHERE id = ${chatId}
  `
  if (Number(updated) < 1) throw new Error('Chat not found')
  return enabled
}

export async function isInstallerChatAiEnabled(installerId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ aiChatEnabled: boolean | null }>>`
      SELECT "aiChatEnabled" FROM "Installer" WHERE id = ${installerId} LIMIT 1
    `
    return rows[0]?.aiChatEnabled !== false
  } catch {
    return true
  }
}

export async function setInstallerChatAiEnabled(installerId: string, enabled: boolean) {
  const updated = await prisma.$executeRaw`
    UPDATE "Installer" SET "aiChatEnabled" = ${enabled} WHERE id = ${installerId}
  `
  if (Number(updated) < 1) throw new Error('Installer not found')
  return enabled
}

export async function getWebsiteChatAiFlags(ids: string[]) {
  return flagsById(ids, async (chatIds) => {
    const rows = await prisma.$queryRaw<Array<{ id: string; aiEnabled: boolean | null }>>`
      SELECT id, "aiEnabled" FROM "WebsiteChat" WHERE id IN (${Prisma.join(chatIds)})
    `
    return rows.map((row) => ({ id: row.id, enabled: row.aiEnabled }))
  })
}

export async function getInstallerChatAiFlags(ids: string[]) {
  return flagsById(ids, async (installerIds) => {
    const rows = await prisma.$queryRaw<Array<{ id: string; aiChatEnabled: boolean | null }>>`
      SELECT id, "aiChatEnabled" FROM "Installer" WHERE id IN (${Prisma.join(installerIds)})
    `
    return rows.map((row) => ({ id: row.id, enabled: row.aiChatEnabled }))
  })
}
