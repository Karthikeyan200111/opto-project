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

  // Vivo 1938 screen (portrait dimensions)
  device: {
    name: 'Vivo 1938',
    heightInch: 6.27,
    widthInch: 2.94,
    // Landscape: width=6.27", height=2.94"
    landscapeWidthInch: 6.27,
    landscapeHeightInch: 2.94,
    ppi: 243,  // approximate PPI
  },

  // Line dimensions
  lineLengthCm: 3,      // cm per side (3+3 = 6cm total)
  lineThicknessPx: 4,   // thick black line
  dotSizePx: 10,        // center dot diameter

  // IPD
  defaultIPD: 60,  // mm
  minIPD: 56,
  maxIPD: 65,

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

/** Convert cm to CSS pixels using standard web 96 DPI */
function cmToPixels(cm) {
  return cm * (96 / 2.54);
}

/** Convert mm to CSS pixels using standard web 96 DPI */
function mmToPixels(mm) {
  return mm * (96 / 25.4);
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
