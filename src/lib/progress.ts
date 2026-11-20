import { useStored } from './store'
import type { WirdDone } from './khatma'
import type { LastRead } from './quran'

/** Shared progress hooks (Home, Quran screen and the planner all read the same stored values). */
export const useWird = () => useStored<WirdDone>('wird.done', {})
export const useLastRead = () => useStored<LastRead | null>('quran.last', null)
