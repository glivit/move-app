import DashboardClient from './DashboardClient'

/**
 * Statische shell — auth wordt afgedwongen door de middleware (elke HTML-
 * navigatie naar /client passeert die) én door elke API-call zelf
 * (getAuthFast met JWT-verificatie). Een server-side gate hier zou de
 * pagina dynamic maken → RSC-roundtrip per tab-tap (0.5-1.5s) i.p.v.
 * instant prefetched navigatie.
 *
 * userId komt client-side uit AuthProvider (lokale JWT-parse, ~ms).
 */
export default function DashboardPage() {
  return <DashboardClient initialData={null} userId={null} />
}
