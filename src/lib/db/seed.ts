// Seed script for loading auction data
// Reads from static JSON for local development
// Will connect to DB when deployed

import rematesData from '../data/remates.json'
import type { Auction } from './schema'

export function getAuctions(): Auction[] {
  return rematesData as Auction[]
}

export function getAuctionsByDateRange(
  startDate: string,
  endDate: string
): Auction[] {
  return getAuctions().filter(
    (a) => a.date >= startDate && a.date <= endDate
  )
}

export function getUpcomingAuctions(): Auction[] {
  const today = new Date().toISOString().split('T')[0]
  return getAuctions()
    .filter((a) => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
}

export function getPastAuctions(): Auction[] {
  const today = new Date().toISOString().split('T')[0]
  return getAuctions()
    .filter((a) => a.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))
}
