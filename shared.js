/**
 * VR Fusional Vergence — Shared Constants & Calculations
 *
 * Device: Vivo 1938 (6.27" x 2.94")
 * VR Lens: +7.5D, Magnification: 4X
 * Formula: y = 80x + 2  (y=prism diopters, x=shift in cm)
 */

const VR_CONFIG = {
  magnification: 4,
  lensPower: 7.5,
  objectDistance: 10,   // cm
  imageDistance: 40,    // cm

  // Vivo Y3 screen — known physical display area
  device: {
    name: 'Vivo Y3',
    // Physical screen dimensions (measured)
    physicalWidthCm: 15,    // landscape width in cm
    physicalHeightCm: 6.8,  // landscape height in cm
    // Screen resolution (physical pixels)
    resolutionW: 1544,      // landscape width in physical pixels
    resolutionH: 720,       // landscape height in physical pixels
    ppi: 400,
  },

  // Layout measurements in cm (physical)
  layout: {
    containerWidthCm: 15,     // total VR container width
    containerHeightCm: 6.8,   // total VR container height
    eyeWidthCm: 7.5,          // each eye-view half width
    dotFromEdgeCm: 3.75,      // dot horizontal distance from outer edge
    dotFromTopCm: 3.4,        // dot vertical distance from top (and bottom)
    lineLengthCm: 3,          // 3cm per side of dot (total 6cm line)
  },

  // Line dimensions
  lineLengthCm: 3,      // 3cm each side (total 6cm)
  lineThicknessPx: 4,   // thick black line
  dotSizePx: 10,        // center dot diameter

  // IPD
  defaultIPD: 75,  // mm (Matches 3.75cm from edges → 3.75cm from divider × 2 = 75mm)
  minIPD: 50,
  maxIPD: 90,

  // Formula coefficients: y = mx + c
  formula: { m: 80, c: 2 },

  // 6 discrete steps (step 0 = initial, no shift)
  steps: [
    { index: 0, shiftCm: 0,     prism: 0  },
    { index: 1, shiftCm: 0.075, prism: 8  },
    { index: 2, shiftCm: 0.15,  prism: 15 },
    { index: 3, shiftCm: 0.22,  prism: 20 },
    { index: 4, shiftCm: 0.27,  prism: 24 },
    { index: 5, shiftCm: 0.35,  prism: 30 },
    { index: 6, shiftCm: 0.45,  prism: 38 },
  ],
};

/** Calculate prism diopters from shift using y = 80x + 2 */
function shiftToPrism(shiftCm) {
  return VR_CONFIG.formula.m * shiftCm + VR_CONFIG.formula.c;
}

/** Reverse: shift from prism */
function prismToShift(prism) {
  return (prism - VR_CONFIG.formula.c) / VR_CONFIG.formula.m;
}

/**
 * Get the ACTUAL CSS-pixels-per-cm for this device.
 * Uses the known physical screen size and the screen's CSS pixel dimensions.
 * This is far more accurate than the browser's fixed 96 DPI reference.
 *
 * Returns { x: pxPerCmHorizontal, y: pxPerCmVertical }
 */
function getDevicePxPerCm() {
  // screen.width / screen.height give CSS pixel dimensions
  const sw = Math.max(screen.width, screen.height);   // landscape width (CSS px)
  const sh = Math.min(screen.width, screen.height);    // landscape height (CSS px)

  const physW = VR_CONFIG.device.physicalWidthCm;      // 15 cm
  const physH = VR_CONFIG.device.physicalHeightCm;     // 6.8 cm

  return {
    x: sw / physW,   // CSS pixels per cm (horizontal)
    y: sh / physH,   // CSS pixels per cm (vertical)
  };
}

/** Convert cm to ACTUAL device CSS pixels (horizontal axis) */
function cmToPixels(cm) {
  return cm * getDevicePxPerCm().x;
}

/** Convert cm to ACTUAL device CSS pixels (vertical axis) */
function cmToPixelsY(cm) {
  return cm * getDevicePxPerCm().y;
}

/** Convert mm to ACTUAL device CSS pixels (horizontal axis) */
function mmToPixels(mm) {
  return (mm / 10) * getDevicePxPerCm().x;
}

/** Generate a random 6-char room code */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
