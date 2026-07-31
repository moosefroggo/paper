(() => {
  const canvas = document.querySelector('.divider-cat')
  const trigger = document.querySelector('[data-cat-trigger]')

  if (!canvas || !trigger) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  class Vec2 {
    constructor(x = 0, y = 0) {
      this.x = x
      this.y = y
    }

    static lerp(first, second, amount) {
      return new Vec2(
        first.x + (second.x - first.x) * amount,
        first.y + (second.y - first.y) * amount,
      )
    }
  }

  class LoafCat {
    constructor(element) {
      this.canvas = element
      this.context = element.getContext('2d')
      this.debug = new URLSearchParams(window.location.search).has('preview')
      this.loafProgress = 1
      this.pointer = new Vec2(-1000, -1000)
      this.gazeAngle = -0.28
      this.gazeInfluence = 0
      this.blinkElapsed = 0
      this.blinkDuration = 0
      this.nextBlink = 2.8
      this.tailFlick = 0
      this.tailFlickElapsed = 0
      this.tailFlickDuration = 0
      this.tailFlickCount = 2
      this.tailLift = 0
      this.tailLiftPeak = 0
      this.nextTailFlick = 2.6 + Math.random() * 3.8
      this.headIdleOffset = 0
      this.headIdleElapsed = 0
      this.headIdleDuration = 0
      this.headIdleDirection = 1
      this.headIdleAmplitude = 0.07
      this.nextHeadIdle = 3.2 + Math.random() * 4.8
      this.yawnProgress = 0
      this.yawnElapsed = 0
      this.yawnDuration = 0
      this.nextYawn = 18 + Math.random() * 28
      this.petProgress = 0
      this.isPetting = false
      this.affectionParticles = []
      this.affectionSpawnElapsed = 0
      this.affectionSpawnInterval = 0.2
      this.affectionSequence = 0
      this.lastFrame = performance.now()

      this.resize()
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(this.canvas)

      window.addEventListener('pointermove', (event) => {
        this.pointer.x = event.clientX
        this.pointer.y = event.clientY
      }, { passive: true })

      document.documentElement.addEventListener('pointerleave', () => {
        this.pointer.x = -1000
        this.pointer.y = -1000
      })

      requestAnimationFrame((time) => this.frame(time))
    }

    resize() {
      const bounds = this.canvas.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return

      this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      this.width = bounds.width
      this.height = bounds.height
      this.scale = this.width <= 760 ? 0.675 : 0.81
      this.worldWidth = this.width / this.scale
      this.worldHeight = this.height / this.scale
      this.groundY = this.worldHeight - 2
      this.mirrorAxisX = this.width * (this.width <= 760 ? 0.82 : 0.87) / this.scale
      this.catX = this.mirrorAxisX - 32

      this.canvas.width = Math.round(this.width * this.pixelRatio)
      this.canvas.height = Math.round(this.height * this.pixelRatio)
    }

    startLoaf() {
      this.blinkElapsed = 0.001
      this.blinkDuration = 0.16
    }

    playIntro() {
      this.blinkElapsed = 0
      this.blinkDuration = 0.22
      this.headIdleElapsed = 0
      this.headIdleDuration = 0
      this.headIdleDirection = -1
      this.headIdleAmplitude = 0.04
      this.nextHeadIdle = 0.06
    }

    frame(time) {
      const delta = Math.min((time - this.lastFrame) / 1000, 0.05)
      this.lastFrame = time
      this.updateBlink(delta)
      this.updateTailFlick(delta)
      this.updateYawn(delta)
      this.updateHeadIdle(delta)
      this.updatePose(delta, time)
      this.updateAffection(delta)
      this.draw()

      if (this.debug) {
        this.canvas.dataset.catState = JSON.stringify({
          loafProgress: this.loafProgress,
          gazeAngle: this.gazeAngle,
          gazeInfluence: this.gazeInfluence,
          blink: this.eyeOpenness,
          tailFlick: this.tailFlick,
          tailLift: this.tailLift,
          headIdleOffset: this.headIdleOffset,
          yawn: this.yawnProgress,
          petting: this.petProgress,
          affectionParticles: this.affectionParticles.length,
        })
      }

      requestAnimationFrame((nextTime) => this.frame(nextTime))
    }

    updateBlink(delta) {
      this.blinkElapsed += delta

      if (!this.blinkDuration && this.blinkElapsed >= this.nextBlink) {
        this.blinkElapsed = 0
        this.blinkDuration = 0.17
      }

      if (this.blinkDuration) {
        const progress = Math.min(this.blinkElapsed / this.blinkDuration, 1)
        this.eyeOpenness = Math.abs(progress * 2 - 1)

        if (progress === 1) {
          this.blinkElapsed = 0
          this.blinkDuration = 0
          this.nextBlink = 3.1 + Math.random() * 2.4
          this.eyeOpenness = 1
        }
      } else {
        this.eyeOpenness = 1
      }
    }

    updateTailFlick(delta) {
      if (reduceMotion) {
        this.tailFlick = 0
        this.tailLift = 0
        return
      }

      if (!this.tailFlickDuration) {
        this.nextTailFlick -= delta
        this.tailFlick = 0
        this.tailLift = 0

        if (this.nextTailFlick <= 0) {
          this.tailFlickElapsed = 0
          this.tailFlickDuration = 0.72 + Math.random() * 0.36
          this.tailFlickCount = Math.random() < 0.68 ? 2 : 3
          this.tailLiftPeak = Math.random() < 0.46 ? 0.82 + Math.random() * 0.24 : 0
        }

        return
      }

      this.tailFlickElapsed += delta
      const progress = Math.min(this.tailFlickElapsed / this.tailFlickDuration, 1)
      const envelope = Math.pow(Math.sin(progress * Math.PI), 0.72)
      const primary = Math.sin(progress * Math.PI * 2 * this.tailFlickCount)
      const irregularity = Math.sin(progress * Math.PI * 3) * 0.18
      this.tailFlick = (primary + irregularity) * envelope
      this.tailLift = envelope * this.tailLiftPeak

      if (progress === 1) {
        this.tailFlick = 0
        this.tailLift = 0
        this.tailFlickElapsed = 0
        this.tailFlickDuration = 0
        this.tailLiftPeak = 0
        this.nextTailFlick = 4.2 + Math.random() * 7.6
      }
    }

    updateYawn(delta) {
      if (reduceMotion) {
        this.yawnProgress = 0
        return
      }

      if (!this.yawnDuration) {
        if (!this.isPetting) this.nextYawn -= delta

        if (this.nextYawn <= 0) {
          this.yawnElapsed = 0
          this.yawnDuration = 2.2 + Math.random() * 0.5
        }

        return
      }

      this.yawnElapsed += delta
      const progress = Math.min(this.yawnElapsed / this.yawnDuration, 1)
      const smoothstep = (value) => value * value * (3 - 2 * value)

      if (progress < 0.3) {
        this.yawnProgress = smoothstep(progress / 0.3)
      } else if (progress < 0.68) {
        this.yawnProgress = 1
      } else {
        this.yawnProgress = 1 - smoothstep((progress - 0.68) / 0.32)
      }

      if (progress === 1) {
        this.yawnProgress = 0
        this.yawnElapsed = 0
        this.yawnDuration = 0
        this.nextYawn = 28 + Math.random() * 42
      }
    }

    updateHeadIdle(delta) {
      if (reduceMotion) {
        this.headIdleOffset = 0
        return
      }

      if (this.yawnDuration) {
        this.headIdleOffset = 0
        return
      }

      if (!this.headIdleDuration) {
        this.nextHeadIdle -= delta
        this.headIdleOffset = 0

        if (this.nextHeadIdle <= 0) {
          this.headIdleElapsed = 0
          this.headIdleDuration = 0.8 + Math.random() * 0.65
          this.headIdleDirection = Math.random() < 0.5 ? -1 : 1
          this.headIdleAmplitude = 0.055 + Math.random() * 0.045
        }

        return
      }

      this.headIdleElapsed += delta
      const progress = Math.min(this.headIdleElapsed / this.headIdleDuration, 1)
      const envelope = Math.sin(progress * Math.PI)
      const variation = 1 + Math.sin(progress * Math.PI * 3) * 0.12
      this.headIdleOffset = (
        this.headIdleDirection
        * this.headIdleAmplitude
        * envelope
        * variation
      )

      if (progress === 1) {
        this.headIdleOffset = 0
        this.headIdleElapsed = 0
        this.headIdleDuration = 0
        this.nextHeadIdle = 4.5 + Math.random() * 7.5
      }
    }

    updatePose(delta, time) {
      const breathe = reduceMotion ? 0 : Math.sin(time * 0.0021) * 1.1 * this.loafProgress
      const sittingHips = new Vec2(this.catX, this.groundY - 18)
      const sittingThorax = new Vec2(this.catX + 46, this.groundY - 48)
      const loafHips = new Vec2(this.catX, this.groundY - 14 + breathe)
      const loafThorax = new Vec2(this.catX + 68, this.groundY - 17 + breathe)

      this.hips = Vec2.lerp(sittingHips, loafHips, this.loafProgress)
      this.thorax = Vec2.lerp(sittingThorax, loafThorax, this.loafProgress)

      const neckLength = 25 - this.loafProgress * 8
      const defaultAngle = -0.28 + this.loafProgress * 0.12
      const defaultNeck = new Vec2(
        this.thorax.x + Math.cos(defaultAngle - 0.15) * neckLength,
        this.thorax.y + Math.sin(defaultAngle - 0.15) * neckLength,
      )
      const bounds = this.canvas.getBoundingClientRect()
      const pointerModelX = 2 * this.mirrorAxisX - (this.pointer.x - bounds.left) / this.scale
      const pointerModelY = (this.pointer.y - bounds.top) / this.scale

      this.gazeAngle = defaultAngle + this.headIdleOffset - this.yawnProgress * 0.1
      this.gazeInfluence = 0
      this.neck = defaultNeck
      this.head = new Vec2(
        this.neck.x + Math.cos(this.gazeAngle) * 16,
        this.neck.y + Math.sin(this.gazeAngle) * 16,
      )
      this.head.y = Math.min(this.head.y, this.groundY - 22)

      const pointerInCanvas = (
        this.pointer.x >= bounds.left
        && this.pointer.x <= bounds.right
        && this.pointer.y >= bounds.top
        && this.pointer.y <= bounds.bottom
      )
      const bodyCenterX = (this.hips.x + this.thorax.x) * 0.5
      const bodyCenterY = this.groundY - 24
      const bodyOffsetX = (pointerModelX - bodyCenterX) / 62
      const bodyOffsetY = (pointerModelY - bodyCenterY) / 34
      const bodyHit = bodyOffsetX * bodyOffsetX + bodyOffsetY * bodyOffsetY <= 1
      const headHit = Math.hypot(
        pointerModelX - this.head.x,
        pointerModelY - this.head.y,
      ) <= 31
      const wasPetting = this.isPetting
      this.isPetting = pointerInCanvas && (bodyHit || headHit)

      if (this.isPetting && !wasPetting) {
        this.affectionSpawnElapsed = this.affectionSpawnInterval
      }

      const petTarget = this.isPetting ? 1 : 0
      const petResponse = reduceMotion ? 1 : 1 - Math.exp(-delta * 12)
      this.petProgress += (petTarget - this.petProgress) * petResponse
      this.eyeOpenness *= 1 - this.petProgress
      this.eyeOpenness *= 1 - this.yawnProgress * 0.86
    }

    updateAffection(delta) {
      if (reduceMotion) {
        this.affectionParticles = []
        return
      }

      if (this.isPetting) {
        this.affectionSpawnElapsed += delta

        if (this.affectionSpawnElapsed >= this.affectionSpawnInterval) {
          this.spawnAffectionParticle()
          this.affectionSpawnElapsed = 0
          this.affectionSpawnInterval = 0.22 + Math.random() * 0.18
        }
      } else {
        this.affectionSpawnElapsed = 0
      }

      this.affectionParticles = this.affectionParticles.filter((particle) => {
        particle.age += delta
        particle.x += particle.velocityX * delta
        particle.y += particle.velocityY * delta
        return particle.age < particle.life
      })
    }

    spawnAffectionParticle() {
      const type = this.affectionSequence % 3 === 1 ? 'purr' : 'heart'
      this.affectionSequence += 1
      const sourceX = (2 * this.mirrorAxisX - (this.head.x + 5)) * this.scale
      const sourceY = (this.head.y - 14) * this.scale

      this.affectionParticles.push({
        type,
        x: sourceX + (Math.random() - 0.5) * 12,
        y: sourceY + (Math.random() - 0.5) * 6,
        velocityX: -14 + Math.random() * 22,
        velocityY: -24 - Math.random() * 16,
        age: 0,
        life: 1.15 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        size: 0.82 + Math.random() * 0.32,
      })
    }

    draw() {
      const context = this.context
      context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
      context.clearRect(0, 0, this.width, this.height)
      context.save()
      context.scale(this.scale, this.scale)
      context.translate(this.mirrorAxisX * 2, 0)
      context.scale(-1, 1)
      this.drawCat(context)
      context.restore()
      this.drawAffection(context)
    }

    drawAffection(context) {
      this.affectionParticles.forEach((particle) => {
        const progress = particle.age / particle.life
        const fadeIn = Math.min(progress * 7, 1)
        const alpha = fadeIn * Math.pow(1 - progress, 1.35)
        const drift = Math.sin(particle.age * 5 + particle.phase) * 3
        const particleScale = particle.size * (0.72 + Math.min(progress * 3, 1) * 0.28)

        context.save()
        context.globalAlpha = alpha
        context.translate(particle.x + drift, particle.y)
        context.scale(particleScale, particleScale)

        if (particle.type === 'heart') {
          context.scale(0.8, 0.8)
          context.beginPath()
          context.moveTo(0, 3)
          context.bezierCurveTo(-8, -2, -6, -9, -1, -9)
          context.bezierCurveTo(2, -9, 4, -7, 5, -4)
          context.bezierCurveTo(6, -7, 8, -9, 11, -9)
          context.bezierCurveTo(16, -9, 18, -2, 10, 4)
          context.lineTo(5, 9)
          context.closePath()
          context.fillStyle = '#ff6b35'
          context.fill()
        } else {
          context.font = '600 11px "Anormal Sans", sans-serif'
          context.fillStyle = '#6f716e'
          context.fillText('purr', 0, 0)
        }

        context.restore()
      })
    }

    drawCat(context) {
      const colors = {
        main: '#222428',
        shadow: '#16181b',
        collar: '#ff6b35',
        bell: '#ffd166',
        eye: '#40c057',
      }

      context.save()
      context.lineCap = 'round'
      context.lineJoin = 'round'

      this.drawTail(context, colors.main)
      this.drawBody(context, colors)
      this.drawNeckAndHead(context, colors)
      context.restore()
    }

    drawTail(context, color) {
      const sittingPoints = {
        start: new Vec2(this.hips.x - 8, this.hips.y - 4),
        first: new Vec2(this.hips.x - 30, this.hips.y - 30),
        second: new Vec2(this.hips.x - 46, this.groundY - 76),
        end: new Vec2(this.hips.x - 40, this.groundY - 88),
      }
      const loafPoints = {
        start: new Vec2(this.hips.x - 7, this.hips.y + 2),
        first: new Vec2(
          this.hips.x - 40 - this.tailFlick * 2,
          this.groundY - 5 - this.tailLift * 7,
        ),
        second: new Vec2(
          this.hips.x - 25 + this.tailFlick * 9,
          this.groundY - 28 - Math.abs(this.tailFlick) * 2 - this.tailLift * 24,
        ),
        end: new Vec2(
          this.hips.x + 10 + this.tailFlick * 18 + this.tailLift * 4,
          this.groundY - 10 - Math.abs(this.tailFlick) * 5 - this.tailLift * 40,
        ),
      }
      const amount = this.loafProgress
      const start = Vec2.lerp(sittingPoints.start, loafPoints.start, amount)
      const first = Vec2.lerp(sittingPoints.first, loafPoints.first, amount)
      const second = Vec2.lerp(sittingPoints.second, loafPoints.second, amount)
      const end = Vec2.lerp(sittingPoints.end, loafPoints.end, amount)

      context.beginPath()
      context.moveTo(start.x, start.y)
      context.bezierCurveTo(first.x, first.y, second.x, second.y, end.x, end.y)
      context.strokeStyle = color
      context.lineWidth = 11
      context.stroke()
    }

    drawBody(context, colors) {
      const bodyTop = this.groundY - 42 - this.loafProgress * 2
      const bodyFront = this.thorax.x + 17
      const bodyBaseline = this.groundY + 2

      context.beginPath()
      context.moveTo(this.hips.x - 14, bodyBaseline)
      context.quadraticCurveTo(this.hips.x - 19, this.hips.y - 20, this.hips.x + 3, bodyTop)
      context.quadraticCurveTo(
        (this.hips.x + this.thorax.x) * 0.5,
        bodyTop - 8,
        bodyFront,
        this.thorax.y - 10,
      )
      context.quadraticCurveTo(bodyFront + 8, this.thorax.y + 15, bodyFront - 1, bodyBaseline)
      context.lineTo(this.hips.x - 14, bodyBaseline)
      context.closePath()
      context.fillStyle = colors.main
      context.fill()

      const pawOpacity = 0.35 + this.loafProgress * 0.65
      context.globalAlpha = pawOpacity
      context.fillStyle = colors.shadow
      context.beginPath()
      context.ellipse(this.thorax.x + 3, this.groundY - 3, 8, 4, 0, 0, Math.PI * 2)
      context.ellipse(this.thorax.x + 17, this.groundY - 3, 8, 4, 0, 0, Math.PI * 2)
      context.fill()
      context.globalAlpha = 1
    }

    drawNeckAndHead(context, colors) {
      const directionX = this.head.x - this.thorax.x
      const directionY = this.head.y - this.thorax.y
      const directionLength = Math.hypot(directionX, directionY) || 1
      const normalX = -directionY / directionLength
      const normalY = directionX / directionLength

      context.beginPath()
      context.moveTo(this.thorax.x + normalX * 12, this.thorax.y + normalY * 12)
      context.lineTo(this.head.x + normalX * 10, this.head.y + normalY * 10)
      context.lineTo(this.head.x - normalX * 10, this.head.y - normalY * 10)
      context.lineTo(this.thorax.x - normalX * 12, this.thorax.y - normalY * 12)
      context.closePath()
      context.fillStyle = colors.main
      context.fill()

      const collarX = (this.thorax.x + this.head.x) * 0.5
      const collarY = (this.thorax.y + this.head.y) * 0.5
      context.save()
      context.translate(collarX, collarY)
      context.rotate(this.gazeAngle + Math.PI * 0.5)
      context.beginPath()
      context.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2)
      context.fillStyle = colors.collar
      context.fill()
      context.beginPath()
      context.arc(0, 6, 3.5, 0, Math.PI * 2)
      context.fillStyle = colors.bell
      context.fill()
      context.restore()

      context.save()
      context.translate(this.head.x, this.head.y)
      context.beginPath()
      context.moveTo(-15, -7)
      context.bezierCurveTo(-14, -16, -7, -19, 2, -18)
      context.bezierCurveTo(10, -17, 16, -11, 17, -3)
      context.lineTo(17, 4)
      context.bezierCurveTo(15, 10, 8, 14, 1, 15)
      context.bezierCurveTo(-7, 15, -13, 11, -15, 6)
      context.bezierCurveTo(-17, 1, -17, -3, -15, -7)
      context.closePath()
      context.fillStyle = colors.main
      context.fill()
      context.beginPath()
      context.ellipse(11, 2, 6.5, 4.5, -0.08, 0, Math.PI * 2)
      context.fill()

      if (this.yawnProgress > 0.01) {
        const mouthY = 8 + this.yawnProgress * 2
        context.beginPath()
        context.ellipse(
          8,
          mouthY,
          3.2 + this.yawnProgress * 2,
          0.6 + this.yawnProgress * 7,
          -0.08,
          0,
          Math.PI * 2,
        )
        context.fillStyle = '#090a0b'
        context.fill()

        if (this.yawnProgress > 0.42) {
          context.beginPath()
          context.ellipse(
            8,
            mouthY + 3.6,
            2.2,
            1.4 * this.yawnProgress,
            -0.08,
            0,
            Math.PI * 2,
          )
          context.fillStyle = '#e97878'
          context.fill()
        }
      }

      context.beginPath()
      context.moveTo(-10, -12)
      context.lineTo(-14, -30)
      context.lineTo(-2, -18)
      context.closePath()
      context.fillStyle = colors.shadow
      context.fill()
      context.beginPath()
      context.moveTo(-4, -14)
      context.lineTo(-6, -32)
      context.lineTo(6, -16)
      context.closePath()
      context.fillStyle = colors.main
      context.fill()

      const eyeX = 6
      const eyeY = -4
      context.beginPath()
      context.ellipse(eyeX, eyeY, 5.5, 5.5 * this.eyeOpenness, 0, 0, Math.PI * 2)
      context.fillStyle = colors.eye
      context.fill()

      if (this.eyeOpenness > 0.08) {
        const pupilTravel = this.gazeInfluence * 1.6
        const pupilX = eyeX + Math.cos(this.gazeAngle) * pupilTravel
        const pupilY = eyeY + Math.sin(this.gazeAngle) * pupilTravel
        context.beginPath()
        context.ellipse(pupilX, pupilY, 1.8, 4.5 * this.eyeOpenness, 0, 0, Math.PI * 2)
        context.fillStyle = '#050505'
        context.fill()
      }

      context.strokeStyle = 'rgba(255, 255, 255, 0.68)'
      context.lineWidth = 1
      for (let whisker = -1; whisker <= 1; whisker += 1) {
        context.beginPath()
        context.moveTo(13, 5 + whisker * 2)
        context.quadraticCurveTo(28, 7 + whisker * 8, 36, 12 + whisker * 14)
        context.stroke()
      }

      context.restore()
    }
  }

  const cat = new LoafCat(canvas)
  const root = document.documentElement
  const forceIntro = new URLSearchParams(window.location.search).has('preview')
  let introSeen = false

  try {
    introSeen = sessionStorage.getItem('portfolio-intro-seen') === 'true'
  } catch {
    introSeen = false
  }

  const shouldPlayIntro = (
    !reduceMotion
    && window.innerWidth > 760
    && (forceIntro || !introSeen)
  )

  if (shouldPlayIntro) {
    try {
      sessionStorage.setItem('portfolio-intro-seen', 'true')
    } catch {
      // The intro still works when storage is unavailable.
    }

    requestAnimationFrame(() => {
      root.classList.add('intro-cat-visible')

      window.setTimeout(() => cat.playIntro(), 120)

      const wait = (duration) => new Promise((resolve) => {
        window.setTimeout(resolve, duration)
      })
      const fontsReady = document.fonts?.ready || Promise.resolve()

      Promise.all([
        wait(280),
        Promise.race([fontsReady, wait(520)]),
      ]).then(() => {
        root.classList.add('intro-reveal')
        root.classList.remove('intro-pending', 'intro-cat-visible')
        document.dispatchEvent(new Event('portfolio:intro-reveal'))

        window.setTimeout(() => {
          root.classList.remove('intro-reveal')
        }, 1200)
      })
    })
  } else {
    root.classList.remove('intro-pending')
    document.dispatchEvent(new Event('portfolio:intro-reveal'))
  }

  trigger.addEventListener('mouseenter', () => cat.startLoaf())
  trigger.addEventListener('focus', () => cat.startLoaf())
})()
