import { useThree } from '@react-three/fiber'

// Wide screens keep the text column clear by pushing every 3D set to the right
// of the travel axis. Narrow screens have no room beside the sets, so instead
// the sets recentre, lift into the top of the frame, and the camera pulls back
// far enough to fit the widest of them; the text then reads underneath.
export function useLayout() {
  const width = useThree((s) => s.size.width)
  const narrow = width < 900
  return {
    narrow,
    offset: narrow ? 0 : 1.95,
    lift: narrow ? 2.6 : 0,
    dolly: narrow ? 9.6 : 0,
    plateX: narrow ? 0.1 : 1.5,
    intensity: narrow ? 0.28 : 1,
  }
}

