import BottomTabs from '@/app/components/BottomTabs'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      maxWidth: 390,
      margin: '0 auto',
      minHeight: '100vh',
      position: 'relative',
      background: 'var(--bg)',
    }}>
      <div style={{ paddingBottom: 72 }}>
        {children}
      </div>
      <BottomTabs />
    </div>
  )
}
