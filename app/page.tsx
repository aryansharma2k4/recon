import HeroSection from '@/components/landing/HeroSection'
import TreemapPreview from '@/components/landing/TreemapPreview'
import TimelinePreview from '@/components/landing/TimelinePreview'
import FeatureShowcase from '@/components/landing/FeatureShowcase'
import Footer from '@/components/landing/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <HeroSection />
      <TreemapPreview />
      <TimelinePreview />
      <FeatureShowcase />
      <Footer />
    </main>
  )
}
