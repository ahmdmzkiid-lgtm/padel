import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Facilities from './components/Facilities'
import Courts from './components/Courts'
import Pricing from './components/Pricing'
import Gallery from './components/Gallery'
import Events from './components/Events'
import Testimonials from './components/Testimonials'
import CTA from './components/CTA'
import Contact from './components/Contact'
import Footer from './components/Footer'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import BookingPage from './pages/BookingPage'
import PaymentPage from './pages/PaymentPage'
import MyBookingsPage from './pages/MyBookingsPage'
import AdminDashboard from './pages/AdminDashboard'
import EventDetailPage from './pages/EventDetailPage'

import PublicSchedule from './components/PublicSchedule'
import ChatWidget from './components/ChatWidget'

const LandingPage = () => {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } else {
      window.scrollTo(0, 0)
    }
  }, [location])

  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Facilities />
      <Courts />
      <PublicSchedule />
      <Pricing />
      <Gallery />
      <Events />
      <Testimonials />
      <CTA />
      <Contact />
      <Footer />
    </>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-dark">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/booking" element={<><Navbar /><BookingPage /><Footer /></>} />
        <Route path="/payment" element={<><Navbar /><PaymentPage /><Footer /></>} />
        <Route path="/my-bookings" element={<><Navbar /><MyBookingsPage /><Footer /></>} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/events/:id" element={<><Navbar /><EventDetailPage /><Footer /></>} />
      </Routes>
      <ChatWidget />
    </div>
  )
}

export default App
