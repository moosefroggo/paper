-- Procedural divider cat for Rive's Node Script protocol.
-- One three-second performance: crouch, jump, run, and settle.

local PI = math.pi
local TAU = PI * 2
local KAPPA = 0.5522847498

type DividerCat = {
  time: number,
  bodyPaint: Paint,
  farPaint: Paint,
  eyePaint: Paint,
  nosePaint: Paint,
}

local function clamp(value: number, minimum: number, maximum: number): number
  return math.max(minimum, math.min(maximum, value))
end

local function easeOutCubic(value: number): number
  local inverse = 1 - value
  return 1 - inverse * inverse * inverse
end

local function easeInOutCubic(value: number): number
  if value < 0.5 then
    return 4 * value * value * value
  end

  local inverse = -2 * value + 2
  return 1 - inverse * inverse * inverse / 2
end

local function ellipsePath(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number
): Path
  local path = Path.new()
  local controlX = radiusX * KAPPA
  local controlY = radiusY * KAPPA

  path:moveTo(Vector.xy(centerX + radiusX, centerY))
  path:cubicTo(
    Vector.xy(centerX + radiusX, centerY + controlY),
    Vector.xy(centerX + controlX, centerY + radiusY),
    Vector.xy(centerX, centerY + radiusY)
  )
  path:cubicTo(
    Vector.xy(centerX - controlX, centerY + radiusY),
    Vector.xy(centerX - radiusX, centerY + controlY),
    Vector.xy(centerX - radiusX, centerY)
  )
  path:cubicTo(
    Vector.xy(centerX - radiusX, centerY - controlY),
    Vector.xy(centerX - controlX, centerY - radiusY),
    Vector.xy(centerX, centerY - radiusY)
  )
  path:cubicTo(
    Vector.xy(centerX + controlX, centerY - radiusY),
    Vector.xy(centerX + radiusX, centerY - controlY),
    Vector.xy(centerX + radiusX, centerY)
  )
  path:close()

  return path
end

local function trianglePath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): Path
  local path = Path.new()
  path:moveTo(Vector.xy(ax, ay))
  path:lineTo(Vector.xy(bx, by))
  path:lineTo(Vector.xy(cx, cy))
  path:close()
  return path
end

local function capsulePath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  radius: number
): Path
  local deltaX = endX - startX
  local deltaY = endY - startY
  local length = math.sqrt(deltaX * deltaX + deltaY * deltaY)

  if length < 0.001 then
    return ellipsePath(startX, startY, radius, radius)
  end

  local normalX = -deltaY / length * radius
  local normalY = deltaX / length * radius
  local path = Path.new()

  path:moveTo(Vector.xy(startX + normalX, startY + normalY))
  path:lineTo(Vector.xy(endX + normalX, endY + normalY))
  path:lineTo(Vector.xy(endX - normalX, endY - normalY))
  path:lineTo(Vector.xy(startX - normalX, startY - normalY))
  path:close()

  return path
end

local function tailPath(
  baseX: number,
  baseY: number,
  phase: number,
  air: number
): Path
  local wave = math.sin(phase * 0.55 - 0.8) * 4 - air * 3
  local path = Path.new()

  path:moveTo(Vector.xy(baseX, baseY - 6.5))
  path:cubicTo(
    Vector.xy(baseX - 16, baseY - 9 + wave * 0.2),
    Vector.xy(baseX - 27, baseY - 34 + wave),
    Vector.xy(baseX - 43, baseY - 33 + wave)
  )
  path:cubicTo(
    Vector.xy(baseX - 53, baseY - 32 + wave),
    Vector.xy(baseX - 57, baseY - 25 + wave),
    Vector.xy(baseX - 51, baseY - 21 + wave)
  )
  path:cubicTo(
    Vector.xy(baseX - 34, baseY - 23 + wave),
    Vector.xy(baseX - 17, baseY - 3 + wave * 0.2),
    Vector.xy(baseX, baseY + 6.5)
  )
  path:close()

  return path
end

local function drawCapsule(
  renderer: Renderer,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  radius: number,
  paint: Paint
)
  renderer:drawPath(capsulePath(startX, startY, endX, endY, radius), paint)
  renderer:drawPath(ellipsePath(startX, startY, radius, radius), paint)
  renderer:drawPath(ellipsePath(endX, endY, radius, radius), paint)
end

local function drawLeg(
  renderer: Renderer,
  hipX: number,
  hipY: number,
  phase: number,
  stride: number,
  lift: number,
  tuck: number,
  width: number,
  paint: Paint
)
  local swing = math.sin(phase)
  local recovery = math.max(0, -math.cos(phase))
  local pawX = hipX + stride * swing + tuck * 0.18 * math.cos(phase)
  local pawY = hipY + 29 - lift * recovery - tuck
  local kneeX = (hipX + pawX) * 0.5 + 5 * math.cos(phase)
  local kneeY = (hipY + pawY) * 0.5 + 7 - tuck * 0.15

  drawCapsule(renderer, hipX, hipY, kneeX, kneeY, width, paint)
  drawCapsule(renderer, kneeX, kneeY, pawX, pawY, width * 0.82, paint)
  drawCapsule(renderer, pawX - 2, pawY, pawX + 8, pawY, width * 0.72, paint)
end

local function route(time: number)
  if time < 0.3 then
    local progress = clamp(time / 0.3, 0, 1)
    local anticipation = math.sin(progress * PI)
    return 90 + progress * 3, 132 + anticipation * 4, progress * PI * 0.55,
      1 + anticipation * 0.045, 1 - anticipation * 0.09, 0
  end

  if time < 0.82 then
    local progress = clamp((time - 0.3) / 0.52, 0, 1)
    local arc = math.sin(progress * PI)
    return 93 + easeOutCubic(progress) * 57, 132 - arc * 48 + progress * 2,
      PI * 0.55 + progress * PI * 0.95, 1, 1, arc
  end

  if time < 2.58 then
    local progress = clamp((time - 0.82) / 1.76, 0, 1)
    local gait = progress * TAU * 2
    local pushAndGlide = progress - math.sin(gait) * 0.018
    return 150 + pushAndGlide * 390, 124 + math.sin(gait * 2 + 0.35) * 0.75,
      gait, 1, 1, 0
  end

  local progress = clamp((time - 2.58) / 0.42, 0, 1)
  local settle = math.sin(progress * PI)
  return 540 + easeInOutCubic(progress) * 8, 124 + settle * 4 + progress * 7,
    TAU * 2 + progress * PI * 0.55, 1 + settle * 0.025, 1 - settle * 0.05, 0
end

function init(self: DividerCat, context: Context): boolean
  self.time = 0
  self.bodyPaint = Paint.with({
    color = Color.rgb(35, 33, 38),
    style = "fill",
  })
  self.farPaint = Paint.with({
    color = Color.rgb(62, 58, 64),
    style = "fill",
  })
  self.eyePaint = Paint.with({
    color = Color.rgb(159, 181, 137),
    style = "fill",
  })
  self.nosePaint = Paint.with({
    color = Color.rgb(102, 86, 92),
    style = "fill",
  })
  return true
end

function advance(self: DividerCat, seconds: number): boolean
  self.time = math.min(self.time + seconds, 3)
  return self.time < 3
end

function draw(self: DividerCat, renderer: Renderer)
  local centerX, centerY, gait, scaleX, scaleY, air = route(self.time)
  local rearHipX = centerX - 21 * scaleX
  local frontHipX = centerX + 22 * scaleX
  local hipY = centerY + 3 * scaleY
  local tuck = air * 13

  renderer:drawPath(tailPath(centerX - 30 * scaleX, centerY - 3, gait, air), self.bodyPaint)

  drawLeg(
    renderer,
    rearHipX - 4,
    hipY,
    gait + PI,
    19,
    12,
    tuck,
    4.5,
    self.farPaint
  )
  drawLeg(
    renderer,
    frontHipX - 4,
    hipY,
    gait + PI * 1.67,
    21,
    14,
    tuck,
    4.3,
    self.farPaint
  )

  renderer:drawPath(
    ellipsePath(centerX, centerY, 34 * scaleX, 14.5 * scaleY),
    self.bodyPaint
  )
  renderer:drawPath(
    ellipsePath(centerX - 22 * scaleX, centerY + 1, 15, 15.5),
    self.bodyPaint
  )
  renderer:drawPath(
    ellipsePath(centerX + 23 * scaleX, centerY + 1, 12, 14),
    self.bodyPaint
  )
  renderer:drawPath(
    ellipsePath(centerX + 31 * scaleX, centerY - 10, 14.5, 14),
    self.bodyPaint
  )
  renderer:drawPath(
    ellipsePath(centerX + 41 * scaleX, centerY - 6, 6, 5),
    self.bodyPaint
  )

  renderer:drawPath(
    trianglePath(
      centerX + 21,
      centerY - 19,
      centerX + 23,
      centerY - 35,
      centerX + 32,
      centerY - 22
    ),
    self.bodyPaint
  )
  renderer:drawPath(
    trianglePath(
      centerX + 32,
      centerY - 22,
      centerX + 39,
      centerY - 34,
      centerX + 43,
      centerY - 18
    ),
    self.bodyPaint
  )

  drawLeg(
    renderer,
    rearHipX,
    hipY,
    gait,
    20,
    14,
    tuck,
    5.2,
    self.bodyPaint
  )
  drawLeg(
    renderer,
    frontHipX,
    hipY,
    gait + PI * 0.67,
    22,
    16,
    tuck,
    5,
    self.bodyPaint
  )

  renderer:drawPath(
    ellipsePath(centerX + 37, centerY - 13, 2.2, 2),
    self.eyePaint
  )
  renderer:drawPath(
    ellipsePath(centerX + 47, centerY - 7, 1.7, 1.4),
    self.nosePaint
  )
end

return function(): Node<DividerCat>
  return {
    time = 0,
    bodyPaint = Paint.with({ color = Color.rgb(35, 33, 38), style = "fill" }),
    farPaint = Paint.with({ color = Color.rgb(62, 58, 64), style = "fill" }),
    eyePaint = Paint.with({ color = Color.rgb(159, 181, 137), style = "fill" }),
    nosePaint = Paint.with({ color = Color.rgb(102, 86, 92), style = "fill" }),
    init = init,
    advance = advance,
    draw = draw,
  }
end
