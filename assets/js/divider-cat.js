(() => {
  const canvas = document.querySelector('.divider-cat')
  const trigger = document.querySelector('[data-cat-trigger]')

  if (!canvas || !trigger) return

  const rust = '#ad644c'
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
      this.blinkElapsed = 0
      this.blinkDuration = 0
      this.nextBlink = 2.8
      this.tailFlick = 0
      this.tailFlickElapsed = 0
      this.tailFlickDuration = 0
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
      this.petLean = new Vec2()
      this.affectionParticles = []
      this.affectionSpawnElapsed = 0
      this.affectionSpawnInterval = 0.2
      this.affectionSequence = 0
      this.idleFrameInterval = 1000 / 30
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

      this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      this.width = bounds.width
      this.height = bounds.height
      this.scale = this.width <= 760 ? 0.675 : 0.81
      this.worldWidth = this.width / this.scale
      this.worldHeight = this.height / this.scale
      this.groundY = this.worldHeight
      this.mirrorAxisX = this.width * (this.width <= 760 ? 0.82 : 0.87) / this.scale
      this.catX = this.mirrorAxisX - 32

      this.canvas.width = Math.round(this.width * this.pixelRatio)
      this.canvas.height = Math.round(this.height * this.pixelRatio)
    }

    startLoaf() {
      this.blinkElapsed = 0.001
      this.blinkDuration = 0.44
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
      if (document.hidden) {
        this.lastFrame = time
        requestAnimationFrame((nextTime) => this.frame(nextTime))
        return
      }

      const elapsed = time - this.lastFrame
      const affectionActive = !reduceMotion && (this.isPetting || this.affectionParticles.length > 0)

      if (!affectionActive && elapsed < this.idleFrameInterval) {
        requestAnimationFrame((nextTime) => this.frame(nextTime))
        return
      }

      const delta = Math.min(elapsed / 1000, 0.05)
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
        this.blinkDuration = 0.48
      }

      if (this.blinkDuration) {
        const progress = Math.min(this.blinkElapsed / this.blinkDuration, 1)
        const closing = Math.min(progress / 0.32, 1)
        const reopening = Math.max((progress - 0.52) / 0.48, 0)
        this.eyeOpenness = 1 - Math.sin(closing * Math.PI / 2) + reopening * reopening

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
          this.tailLiftPeak = 0.65 + Math.random() * 0.35
        }

        return
      }

      this.tailFlickElapsed += delta
      const progress = Math.min(this.tailFlickElapsed / this.tailFlickDuration, 1)
      const envelope = Math.pow(Math.sin(progress * Math.PI), 0.72)
      this.tailFlick = Math.sin(progress * Math.PI * 2) * envelope
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
      this.head = new Vec2(
        defaultNeck.x + Math.cos(this.gazeAngle) * 16,
        defaultNeck.y + Math.sin(this.gazeAngle) * 16,
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
      const petResponse = reduceMotion ? 1 : 1 - Math.exp(-delta * 8)
      this.petProgress += (petTarget - this.petProgress) * petResponse
      if (!reduceMotion) {
        const petAngle = Math.atan2(pointerModelY - this.head.y, pointerModelX - this.head.x)
        const reach = this.isPetting ? 3.5 : 0
        this.petLean = Vec2.lerp(
          this.petLean,
          new Vec2(Math.cos(petAngle) * reach, Math.sin(petAngle) * reach),
          petResponse,
        )
        this.head.x += this.petLean.x
        this.head.y += this.petLean.y
      }
      this.eyeOpenness *= (1 - this.petProgress) * (1 - this.yawnProgress * 0.86)
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
          context.fillStyle = rust
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
        main: '#252622',
        shadow: '#181915',
        detail: '#62645d',
        collar: rust,
        eye: '#a7b6a0',
      }

      context.save()
      context.lineCap = 'round'
      context.lineJoin = 'round'

      this.drawTail(context, colors)
      this.drawBody(context, colors)
      this.drawNeckAndHead(context, colors)
      context.restore()
    }

    drawTail(context, colors) {
      const tipX = -20 + this.tailFlick * 5
      const tipY = -19 - this.tailLift * 7

      context.save()
      context.translate(this.hips.x, this.groundY)
      context.beginPath()
      context.moveTo(3, -8)
      context.bezierCurveTo(-15, 4, -39, 1, -42, -10)
      context.bezierCurveTo(-45, -22, tipX - 10, tipY - 9, tipX, tipY)
      context.bezierCurveTo(tipX + 5, tipY + 5, tipX - 1, tipY + 6, tipX - 4, tipY + 3)
      context.bezierCurveTo(tipX - 10, tipY - 3, -40, -17, -35, -10)
      context.bezierCurveTo(-31, -4, -11, -6, 0, -17)
      context.closePath()
      context.fillStyle = colors.main
      context.fill()
      context.restore()
    }

    drawBody(context, colors) {
      const backY = this.hips.y - 34
      const shoulderX = this.thorax.x + 12
      const shoulderY = this.thorax.y - 15
      const ground = this.groundY

      context.beginPath()
      context.moveTo(shoulderX - 8, ground - 8)
      context.bezierCurveTo(shoulderX + 3, ground - 12, shoulderX + 18, ground - 9, shoulderX + 18, ground - 4)
      context.quadraticCurveTo(shoulderX + 17, ground, shoulderX + 9, ground)
      context.lineTo(shoulderX - 10, ground)
      context.closePath()
      context.fillStyle = colors.shadow
      context.fill()

      context.beginPath()
      context.moveTo(this.hips.x + 6, ground)
      context.bezierCurveTo(this.hips.x - 27, ground, this.hips.x - 24, backY, this.hips.x + 9, backY)
      context.bezierCurveTo(this.hips.x + 33, backY - 2, this.thorax.x - 18, shoulderY - 7, shoulderX, shoulderY)
      context.bezierCurveTo(shoulderX + 13, shoulderY + 6, shoulderX + 10, ground - 2, shoulderX - 8, ground - 2)
      context.quadraticCurveTo(this.thorax.x - 28, ground, this.hips.x + 6, ground)
      context.closePath()
      context.fillStyle = colors.main
      context.fill()

      context.beginPath()
      context.moveTo(shoulderX + 1, ground - 6)
      context.quadraticCurveTo(shoulderX + 9, ground - 9, shoulderX + 13, ground - 5)
      context.strokeStyle = colors.detail
      context.lineWidth = 1
      context.stroke()
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

      const collarX = this.thorax.x + directionX * 0.4
      const collarY = this.thorax.y + directionY * 0.4
      context.save()
      context.translate(collarX, collarY)
      context.rotate(Math.atan2(directionY, directionX))
      context.beginPath()
      context.moveTo(0, -10)
      context.quadraticCurveTo(6, 0, -0.5, 11)
      context.strokeStyle = colors.collar
      context.lineWidth = 4.2
      context.stroke()
      context.restore()

      context.save()
      context.translate(this.head.x, this.head.y)

      context.beginPath()
      context.moveTo(1, -15)
      context.quadraticCurveTo(6, -26, 11, -27)
      context.quadraticCurveTo(14, -28, 16, -24)
      context.lineTo(19, -20)
      context.quadraticCurveTo(20, -18, 17, -19)
      context.lineTo(13, -20)
      context.quadraticCurveTo(13, -15, 15, -12)
      context.closePath()
      context.fillStyle = colors.shadow
      context.fill()

      context.beginPath()
      context.moveTo(-17, -3)
      context.quadraticCurveTo(-18, -10, -13, -15)
      context.quadraticCurveTo(-14, -24, -13, -31)
      context.quadraticCurveTo(-13, -33, -10, -30)
      context.quadraticCurveTo(-4, -26, -1, -19)
      context.bezierCurveTo(8, -20, 15, -14, 16, -7)
      context.quadraticCurveTo(17, -2, 21, 0)
      context.quadraticCurveTo(22, 3, 18, 6)
      context.bezierCurveTo(14, 14, 3, 17, -7, 13)
      context.quadraticCurveTo(-17, 10, -17, -3)
      context.closePath()
      context.fillStyle = colors.main
      context.fill()

      context.beginPath()
      context.moveTo(-10, -25)
      context.quadraticCurveTo(-7, -22, -5, -18)
      context.strokeStyle = colors.detail
      context.lineWidth = 1.1
      context.stroke()

      context.beginPath()
      context.moveTo(18, -0.6)
      context.quadraticCurveTo(22.5, -1, 21, 2.7)
      context.quadraticCurveTo(19, 4.1, 17.5, 1.4)
      context.closePath()
      context.fillStyle = '#121310'
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

      this.drawEye(context, colors)

      context.strokeStyle = '#777970'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(14, 4)
      context.quadraticCurveTo(23, 1, 31, 3)
      context.moveTo(14, 6.5)
      context.quadraticCurveTo(24, 6.5, 29, 11)
      context.stroke()

      context.restore()
    }

    drawEye(context, colors) {
      const openness = this.eyeOpenness
      context.beginPath()
      context.moveTo(-0.5, -5)
      if (openness < 0.08) {
        context.quadraticCurveTo(6, -1.5, 13, -5.5)
        context.strokeStyle = colors.eye
        context.lineWidth = 1.1
        context.stroke()
        return
      }

      context.quadraticCurveTo(6, -5 - openness * 2, 13, -5.5)
      context.quadraticCurveTo(8, -5 + 10 * openness, -0.5, -5)
      context.closePath()
      context.fillStyle = colors.eye
      context.fill()

      context.save()
      context.clip()
      context.beginPath()
      context.ellipse(8.2, -3.7, 1.35, 4.1, 0.1, 0, Math.PI * 2)
      context.fillStyle = colors.shadow
      context.fill()
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
    && !window.matchMedia('(max-width: 760px), (max-width: 1024px) and (pointer: coarse)').matches
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
        wait(840),
        Promise.race([fontsReady, wait(1000)]),
      ]).then(() => {
        root.classList.add('intro-reveal')
        root.classList.remove('intro-pending', 'intro-cat-visible')
        document.dispatchEvent(new Event('portfolio:intro-reveal'))

        window.setTimeout(() => {
          root.classList.remove('intro-reveal')
        }, 1600)
      })
    })
  } else {
    root.classList.remove('intro-pending')
    document.dispatchEvent(new Event('portfolio:intro-reveal'))
  }

  trigger.addEventListener('mouseenter', () => cat.startLoaf())
  trigger.addEventListener('focus', () => cat.startLoaf())
})()
