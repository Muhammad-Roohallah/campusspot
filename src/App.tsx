import { useEffect } from 'react'
import { StoreProvider, useSnapshot, useStore } from './data/StoreContext'
import { ToastProvider, useToast } from './components/Toast'
import { useRoute } from './router'
import { useZoneWatcher } from './watch'
import { Home } from './screens/Home'
import { Cafe } from './screens/Cafe'
import { Library } from './screens/Library'
import { Parking } from './screens/Parking'
import { Staff } from './screens/Staff'

function Routes() {
  const route = useRoute()
  const snap = useSnapshot()
  const store = useStore()
  const toast = useToast()
  useZoneWatcher()
  // Show data problems (for example a failed write) as a message, then clear them.
  useEffect(() => { if (snap.error) { toast(snap.error); store.clearError() } }, [snap.error, store, toast])
  switch (route[0]) {
    case 'cafe': return <Cafe />
    case 'library': return <Library route={route} />
    case 'parking': return <Parking route={route} />
    case 'staff': return <Staff />
    default: return <Home />
  }
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Routes />
      </ToastProvider>
    </StoreProvider>
  )
}
