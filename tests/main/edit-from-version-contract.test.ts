import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('edit-from-version full contract', () => {
  it('VersionDetailModal has onEditFromVersion prop', () => {
    const source = fs.readFileSync('src/renderer/components/VersionDetailModal.tsx', 'utf8')
    expect(source).toContain('onEditFromVersion')
    expect(source).toContain('基于此版本修改')
  })

  it('EditVersionModal exists and has key elements', () => {
    const source = fs.readFileSync('src/renderer/components/EditVersionModal.tsx', 'utf8')
    expect(source).toContain('开始编辑')
    expect(source).toContain('baseVersion')
    expect(source).toContain('suggestedVersion')
  })

  it('EditSessionBar exists and has key elements', () => {
    const source = fs.readFileSync('src/renderer/components/EditSessionBar.tsx', 'utf8')
    expect(source).toContain('正在编辑')
    expect(source).toContain('完成修改')
    expect(source).toContain('取消编辑')
  })

  it('App.tsx integrates edit session flow', () => {
    const source = fs.readFileSync('src/renderer/App.tsx', 'utf8')
    expect(source).toContain('editSession')
    expect(source).toContain('EditVersionModal')
    expect(source).toContain('handleEditFromVersion')
    expect(source).toContain('handleStartEditSession')
    expect(source).toContain('handleCancelEdit')
    expect(source).toContain('handleFinishEdit')
    expect(source).toContain('onEditSessionFinished')
  })

  it('Timeline accepts editSession prop', () => {
    const source = fs.readFileSync('src/renderer/components/Timeline.tsx', 'utf8')
    expect(source).toContain('editSession')
    expect(source).toContain('EditSessionBar')
  })

  it('Sidebar accepts uploadDisabled prop', () => {
    const source = fs.readFileSync('src/renderer/components/Sidebar.tsx', 'utf8')
    expect(source).toContain('uploadDisabled')
  })

  it('edit-session module exports required functions', () => {
    const source = fs.readFileSync('src/main/edit-session.ts', 'utf8')
    expect(source).toContain('export function createEditSession')
    expect(source).toContain('export function archiveSession')
    expect(source).toContain('export function clearSession')
    expect(source).toContain('export function startLockFileWatch')
    expect(source).toContain('export function loadPersistedSession')
  })
})
