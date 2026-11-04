(() => {
  // Touch devices use the native play button. Playback must also work when
  // a browser declines autoplay, or when JavaScript is unavailable.
  const allowAutoplay = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    && !navigator.connection?.saveData

  if (!allowAutoplay || !('IntersectionObserver' in window)) return

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target: video, isIntersecting }) => {
      if (isIntersecting) {
        // Try once, so scrolling never overrides someone's pause button.
        observer.unobserve(video)
        video.play().catch(() => {
          // The poster and native controls remain available.
        })
      }
    })
  }, { threshold: 0.15 })

  document.querySelectorAll('video').forEach((video) => observer.observe(video))
})()
