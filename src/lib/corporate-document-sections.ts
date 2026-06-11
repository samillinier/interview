import { FileText, type LucideIcon } from 'lucide-react'

export type CorporateDocumentSection = {
  slug: string
  title: string
  description: string
  cta: string
  highlights: string[]
}

export const CORPORATE_DOCUMENT_SECTIONS: CorporateDocumentSection[] = [
  {
    slug: 'btr',
    title: 'BTR',
    description: 'Manage Business Tax Receipt records, renewals, and compliance documentation.',
    cta: 'Open BTR',
    highlights: ['Renewals', 'Compliance', 'Records'],
  },
  {
    slug: 'firm-lead',
    title: 'Firm Lead',
    description: 'Track and manage firm lead records, outreach, and pipeline activity.',
    cta: 'Open firm lead',
    highlights: ['Lead tracking', 'Outreach', 'Pipeline'],
  },
  {
    slug: 'licences',
    title: 'Licences',
    description: 'View and manage licence records, status, and related documents.',
    cta: 'Open licences',
    highlights: ['Licence records', 'Status tracking', 'Documents'],
  },
  {
    slug: 'lrrp',
    title: 'LRRP',
    description: 'Manage Loss Run Report Package submissions, reviews, and filings.',
    cta: 'Open LRRP',
    highlights: ['Submissions', 'Reviews', 'Filings'],
  },
  {
    slug: 'liability',
    title: 'Liability',
    description: 'Track liability claims, insurance records, and associated documentation.',
    cta: 'Open liability',
    highlights: ['Claims', 'Insurance', 'Documentation'],
  },
]

export const CORPORATE_DOCUMENT_SECTION_ICON: LucideIcon = FileText
