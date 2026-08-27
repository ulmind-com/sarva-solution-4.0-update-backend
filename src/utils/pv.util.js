/**
 * PV Step Rules (Activation & Binary Matching)
 *
 * Activation PV is counted in fixed 0.5 steps. A first purchase must carry at
 * least MIN_ACTIVATION_PV, and only whole 0.5 steps count towards the binary
 * legs — anything above the last full step is flushed out.
 *
 * e.g. 0.6 PV bought -> 0.5 counts, 0.1 flushed. 0.4 PV -> no bill at all.
 */

export const PV_STEP = 0.5;
export const MIN_ACTIVATION_PV = 0.5;

/**
 * Floor a raw PV amount down to the nearest 0.5 step.
 * The epsilon guards against float noise (e.g. 1.5 / 0.5 === 2.9999...).
 */
export const toEffectivePV = (pv) => {
    const raw = Number(pv) || 0;
    if (raw <= 0) return 0;
    return Math.floor(raw / PV_STEP + 1e-9) * PV_STEP;
};

/**
 * PV lost because it did not complete a 0.5 step.
 */
export const getFlushedPV = (pv) => {
    const raw = Number(pv) || 0;
    if (raw <= 0) return 0;
    return parseFloat((raw - toEffectivePV(raw)).toFixed(4));
};
