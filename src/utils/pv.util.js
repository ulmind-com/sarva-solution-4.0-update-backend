/**
 * PV Step & Cap Rules (Activation, Matching & Franchise Commission)
 *
 * A first purchase counts in fixed 0.5 steps AND is capped at 1 PV:
 *   below 0.5  -> no bill at all
 *   0.5 - 0.99 -> counts as 0.5
 *   1 and above -> counts as 1, everything above is flushed out
 *
 * The bill still records what was actually bought; only the counted part
 * reaches the binary legs and the franchise commission.
 */

export const PV_STEP = 0.5;
export const MIN_ACTIVATION_PV = 0.5;
export const MAX_ACTIVATION_PV = 1;

/**
 * Floor a PV amount down to the nearest 0.5 step, with no cap.
 * Use for accumulated totals such as leg PV, which legitimately exceed 1.
 * The epsilon guards against float noise (e.g. 1.5 / 0.5 === 2.9999...).
 */
export const floorToPvStep = (pv) => {
    const raw = Number(pv) || 0;
    if (raw <= 0) return 0;
    return Math.floor(raw / PV_STEP + 1e-9) * PV_STEP;
};

/**
 * PV credited for a single first purchase: floored to a 0.5 step, then capped
 * at 1. Anything a member buys beyond 1 PV earns nothing extra.
 */
export const toEffectivePV = (pv) => {
    const raw = Number(pv) || 0;
    if (raw <= 0) return 0;
    if (raw >= MAX_ACTIVATION_PV) return MAX_ACTIVATION_PV;
    return floorToPvStep(raw);
};

/**
 * PV bought but dropped — either because it did not complete a 0.5 step,
 * or because it went past the 1 PV cap.
 */
export const getFlushedPV = (pv) => {
    const raw = Number(pv) || 0;
    if (raw <= 0) return 0;
    return parseFloat((raw - toEffectivePV(raw)).toFixed(4));
};
