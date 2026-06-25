import type { FileType } from '@shared/types'

export const FILE_COLORS: Record<string, string> = {
  // PDF
  pdf: '#F97316',
  // Documents
  doc: '#3B82F6', docx: '#3B82F6', txt: '#3B82F6', md: '#3B82F6', rtf: '#3B82F6',
  // Spreadsheets
  xls: '#22C55E', xlsx: '#22C55E', csv: '#22C55E', ods: '#22C55E',
  // Presentations
  ppt: '#EF4444', pptx: '#EF4444', key: '#EF4444', odp: '#EF4444',
  // Images
  jpg: '#8B5CF6', jpeg: '#8B5CF6', png: '#8B5CF6', gif: '#8B5CF6',
  svg: '#8B5CF6', webp: '#8B5CF6', bmp: '#8B5CF6', ico: '#8B5CF6',
}

export function getFileColor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return FILE_COLORS[ext] ?? '#9CA3AF'
}

export const FILE_TYPE_COLOR: Record<FileType, string> = {
  folder: '#7C7C85',
  pdf: '#F97316',
  doc: '#3B82F6',
  xls: '#22C55E',
  ppt: '#EF4444',
  img: '#8B5CF6',
  other: '#9CA3AF',
}
