'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import { Camera, CheckCircle2, Edit2, Loader2, Save, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type TrackerStage = { key: string; label: string }

type IosProfileHeroProps = {
  name: string
  companyName?: string
  photoUrl?: string | null
  status?: string | null
  trackerStages: readonly TrackerStage[]
  currentTrackerKey: string
  completionPercent: number
  isUploadingPhoto: boolean
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function IosProfileHero({
  name,
  companyName,
  photoUrl,
  status,
  trackerStages,
  currentTrackerKey,
  completionPercent,
  isUploadingPhoto,
  onPhotoUpload,
}: IosProfileHeroProps) {
  const currentIdx = Math.max(
    0,
    trackerStages.findIndex((s) => s.key === currentTrackerKey)
  )

  const ringClass =
    status === 'active'
      ? 'ring-[#8CB63C]'
      : status === 'deactive'
        ? 'ring-slate-800'
        : status === 'passed' || status === 'qualified'
          ? 'ring-blue-500'
          : status === 'failed' || status === 'notQualified'
            ? 'ring-red-500'
            : 'ring-amber-400'

  return (
    <div className="2xl:hidden px-4 pb-3">
      <div className="flex flex-col items-center text-center pt-1 pb-4">
        <div className="relative mb-3">
          <div
            className={cn(
              'w-[92px] h-[92px] rounded-full overflow-hidden ring-[3px] flex items-center justify-center bg-[#e5e5ea]',
              ringClass
            )}
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt="Profile"
                width={92}
                height={92}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-[#8e8e93]" />
            )}
          </div>
          <label className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-[#8CB63C] flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-transform">
            <input
              type="file"
              accept="image/*"
              onChange={onPhotoUpload}
              disabled={isUploadingPhoto}
              className="hidden"
            />
            {isUploadingPhoto ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-white" />
            )}
          </label>
        </div>

        <h2 className="text-[22px] font-bold text-[#1c1c1e] tracking-[-0.3px] leading-tight px-2">
          {name}
        </h2>
        {companyName ? (
          <p className="mt-1 text-[15px] text-[#8e8e93] font-medium truncate max-w-[280px]">
            {companyName}
          </p>
        ) : null}

        <div className="mt-3 w-full max-w-[220px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wide">
              Profile
            </span>
            <span className="text-[13px] font-bold text-[#8CB63C] tabular-nums">
              {completionPercent}%
            </span>
          </div>
          <div className="h-[5px] rounded-full bg-[#e5e5ea] overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                completionPercent < 30
                  ? 'bg-red-400'
                  : completionPercent < 60
                    ? 'bg-amber-400'
                    : 'bg-[#8CB63C]'
              )}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
        {trackerStages.map((s, idx) => {
          const isCurrent = idx === currentIdx
          const isDone = idx < currentIdx
          return (
            <span
              key={s.key}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0',
                isCurrent
                  ? 'bg-[#8CB63C] text-white'
                  : isDone
                    ? 'bg-[#8CB63C]/15 text-[#5f8a28]'
                    : 'bg-white text-[#8e8e93]'
              )}
            >
              {(isDone || isCurrent) && <CheckCircle2 className="w-3 h-3" />}
              {s.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

type IosProfileTopBarProps = {
  title?: string
}

export function IosProfileTopBar({ title = 'Profile' }: IosProfileTopBarProps) {
  return (
    <div
      className="2xl:hidden sticky top-0 z-30 bg-[#f2f2f7]/92 backdrop-blur-xl border-b border-black/[0.06]"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
    >
      <div className="flex items-end h-12 px-4 pb-2 pr-16">
        <h1 className="text-[17px] font-semibold text-[#1c1c1e] tracking-[-0.2px]">{title}</h1>
      </div>
    </div>
  )
}

type IosProfileEditBarProps = {
  isEditing: boolean
  isSaving: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
}

export function IosProfileEditBar({
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
}: IosProfileEditBarProps) {
  return (
    <div
      className="ios-edit-bar 2xl:hidden fixed bottom-0 inset-x-0 z-40 bg-[#f2f2f7]/94 backdrop-blur-xl border-t border-black/[0.08]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
    >
      <div className="px-4 pt-2 pb-1.5 flex gap-2">
        {!isEditing ? (
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 h-[42px] rounded-[10px] bg-[#8CB63C] text-white text-[13px] font-semibold tracking-[-0.2px] active:opacity-80 transition-opacity"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-1 h-[42px] rounded-[10px] bg-white text-[#1c1c1e] text-[13px] font-semibold tracking-[-0.2px] border border-black/[0.08] active:bg-black/[0.04] disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="flex-[1.4] flex items-center justify-center gap-1 h-[42px] rounded-[10px] bg-[#8CB63C] text-white text-[13px] font-semibold tracking-[-0.2px] active:opacity-80 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Apple system UI stack — never Inter */
export const IOS_PROFILE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF UI Text", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif'

type IosProfileRootProps = {
  children: ReactNode
  className?: string
}

export function IosProfileRoot({ children, className }: IosProfileRootProps) {
  return (
    <>
      {/* Injected late so it beats body font-sans / Inter from the root layout */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .ios-installer-profile,
            .ios-installer-profile *:not(svg):not(path):not(canvas) {
              font-family: ${IOS_PROFILE_FONT} !important;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          `,
        }}
      />
      <div
        className={cn(
          'ios-installer-profile min-h-screen 2xl:min-h-0 bg-[#f2f2f7] 2xl:bg-transparent font-normal',
          className
        )}
        style={{ fontFamily: IOS_PROFILE_FONT }}
      >
        {children}
      </div>
    </>
  )
}
