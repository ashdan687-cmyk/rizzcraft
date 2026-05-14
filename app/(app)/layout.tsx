import BottomTabs from '@/app/components/BottomTabs'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: 640,
      marginLeft: 'auto',
      marginRight: 'auto',
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
