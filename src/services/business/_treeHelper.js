/**
 * Shared Tree Helper — Optimized BFS descendant lookup using in-memory traversal.
 * 
 * Instead of querying the DB for each node one-by-one (N+1 problem),
 * we fetch ALL users' leftChild/rightChild in a SINGLE query, build a lookup map,
 * and then traverse the tree entirely in memory.
 * 
 * This produces the EXACT same results as the old _getDescendantIds,
 * but with 1 DB query instead of N.
 */

let _cachedLookup = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds cache

/**
 * Build or return cached lookup map of userId -> { leftChild, rightChild }
 * Cache is valid for 30 seconds to avoid re-querying during batch operations.
 */
export const getTreeLookup = async (User) => {
    const now = Date.now();
    if (_cachedLookup && (now - _cacheTimestamp) < CACHE_TTL_MS) {
        return _cachedLookup;
    }

    const allUsers = await User.find({})
        .select('_id leftChild rightChild')
        .lean();

    const lookup = new Map();
    for (const u of allUsers) {
        lookup.set(u._id.toString(), u);
    }

    _cachedLookup = lookup;
    _cacheTimestamp = now;
    return lookup;
};

/**
 * Invalidate the cache (call after tree mutations if needed)
 */
export const invalidateTreeCache = () => {
    _cachedLookup = null;
    _cacheTimestamp = 0;
};

/**
 * Get all descendant IDs from a starting node using in-memory BFS.
 * This is a drop-in replacement for the old _getDescendantIds.
 * 
 * @param {Map} lookup - The tree lookup map from getTreeLookup()
 * @param {ObjectId|string} startNodeId - The root node to start BFS from
 * @returns {string[]} Array of descendant user ID strings (includes startNodeId)
 */
export const getDescendantIds = (lookup, startNodeId) => {
    if (!startNodeId) return [];
    const ids = [];
    const queue = [startNodeId.toString()];

    while (queue.length > 0) {
        const currentId = queue.shift();
        ids.push(currentId);

        const node = lookup.get(currentId);
        if (node) {
            if (node.leftChild) queue.push(node.leftChild.toString());
            if (node.rightChild) queue.push(node.rightChild.toString());
        }
    }

    return ids;
};

/**
 * Sum repurchase BV for a set of user IDs in a given month.
 * Uses $in query for batch operation (same as before, already efficient).
 */
export const sumRepurchaseBV = async (SelfRepurchaseBVEntry, userIds, year, month) => {
    if (!userIds || userIds.length === 0) return 0;
    const entries = await SelfRepurchaseBVEntry.find({ userId: { $in: userIds }, year, month }).lean();
    return entries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);
};
