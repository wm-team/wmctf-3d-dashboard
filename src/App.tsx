import { DashboardShell } from '@/components/layout/DashboardShell'
import { mockCtfState } from '@/data/mockCtfState'

export default function App() {
  return <DashboardShell snapshot={mockCtfState} />
}
