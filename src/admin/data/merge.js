function equal(left, right) {
  if (left === undefined || right === undefined) return left === right;
  return JSON.stringify(left) === JSON.stringify(right);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function recordArray(values) {
  const existing = values.filter(Array.isArray).flat().filter((item) => item !== undefined);
  return existing.length > 0 && existing.every((item) => plainObject(item) && typeof item.id === "string");
}

function pathKey(path) {
  return `/${path.map((part) => String(part).replaceAll("~", "~0").replaceAll("/", "~1")).join("/")}`;
}

export function mergePortfolioFiles(base, local, remote, selections = {}) {
  const conflicts = [];

  function insertMissingIds(order, source, allowed) {
    const result = [...order];
    for (const id of source) {
      if (!allowed.has(id) || result.includes(id)) continue;
      const sourceIndex = source.indexOf(id);
      const previous = source.slice(0, sourceIndex).reverse().find((candidate) => result.includes(candidate));
      const next = source.slice(sourceIndex + 1).find((candidate) => result.includes(candidate));
      if (next) result.splice(result.indexOf(next), 0, id);
      else if (previous) result.push(id);
      else result.push(id);
    }
    return result;
  }

  function completeOrder(primary, secondary, fallback, survivingIds) {
    const allowed = new Set(survivingIds);
    let result = primary.filter((id) => allowed.has(id));
    result = insertMissingIds(result, secondary, allowed);
    result = insertMissingIds(result, fallback, allowed);
    return insertMissingIds(result, survivingIds, allowed);
  }

  function mergeRecordOrder(baseItems, localItems, remoteItems, survivingIds, path) {
    const baseOrder = baseItems.map((item) => item.id);
    const localOrder = localItems.map((item) => item.id);
    const remoteOrder = remoteItems.map((item) => item.id);
    const baseIds = new Set(baseOrder);
    const localIds = new Set(localOrder);
    const remoteIds = new Set(remoteOrder);
    const surviving = new Set(survivingIds);
    const baseForLocal = baseOrder.filter((id) => localIds.has(id) && surviving.has(id));
    const baseForRemote = baseOrder.filter((id) => remoteIds.has(id) && surviving.has(id));
    const localBaseOrder = localOrder.filter((id) => baseIds.has(id) && surviving.has(id));
    const remoteBaseOrder = remoteOrder.filter((id) => baseIds.has(id) && surviving.has(id));
    const localReordered = !equal(localBaseOrder, baseForLocal);
    const remoteReordered = !equal(remoteBaseOrder, baseForRemote);
    const sharedBaseIds = new Set(baseOrder.filter((id) => localIds.has(id) && remoteIds.has(id) && surviving.has(id)));
    const localSharedOrder = localOrder.filter((id) => sharedBaseIds.has(id));
    const remoteSharedOrder = remoteOrder.filter((id) => sharedBaseIds.has(id));

    const localCandidate = completeOrder(localOrder, remoteOrder, baseOrder, survivingIds);
    const remoteCandidate = completeOrder(remoteOrder, localOrder, baseOrder, survivingIds);
    if (localReordered && remoteReordered && !equal(localSharedOrder, remoteSharedOrder)) {
      const orderPath = [...path, "$order"];
      const key = pathKey(orderPath);
      if (selections[key] === "remote") return remoteCandidate;
      if (selections[key] === "local") return localCandidate;
      conflicts.push({ key, path: orderPath.join("."), base: baseOrder, local: localCandidate, remote: remoteCandidate });
      return localCandidate;
    }
    if (remoteReordered && !localReordered) return remoteCandidate;
    if (localReordered && !remoteReordered) return localCandidate;
    if (localReordered && remoteReordered) return localCandidate;
    return completeOrder(baseOrder, localOrder, remoteOrder, survivingIds);
  }

  function merge(baseValue, localValue, remoteValue, path) {
    if (Array.isArray(baseValue) && Array.isArray(localValue) && Array.isArray(remoteValue) && recordArray([baseValue, localValue, remoteValue])) {
      const byId = (items) => new Map(items.map((item) => [item.id, item]));
      const baseMap = byId(baseValue);
      const localMap = byId(localValue);
      const remoteMap = byId(remoteValue);
      const ids = [...new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()])];
      const merged = new Map();
      for (const id of ids) {
        const item = merge(baseMap.get(id), localMap.get(id), remoteMap.get(id), [...path, `#${id}`]);
        if (item !== undefined) merged.set(id, item);
      }
      const order = mergeRecordOrder(baseValue, localValue, remoteValue, [...merged.keys()], path);
      return order.map((id) => merged.get(id)).filter((item) => item !== undefined);
    }

    if (equal(localValue, remoteValue)) return structuredClone(localValue);
    if (equal(localValue, baseValue)) return structuredClone(remoteValue);
    if (equal(remoteValue, baseValue)) return structuredClone(localValue);

    const key = pathKey(path);
    if (selections[key] === "local") return structuredClone(localValue);
    if (selections[key] === "remote") return structuredClone(remoteValue);

    if (plainObject(baseValue) && plainObject(localValue) && plainObject(remoteValue)) {
      const result = {};
      for (const property of new Set([...Object.keys(baseValue), ...Object.keys(localValue), ...Object.keys(remoteValue)])) {
        const value = merge(baseValue[property], localValue[property], remoteValue[property], [...path, property]);
        if (value !== undefined) result[property] = value;
      }
      return result;
    }

    conflicts.push({ key, path: path.join("."), base: baseValue, local: localValue, remote: remoteValue });
    return structuredClone(localValue);
  }

  const files = merge(base, local, remote, []);
  return { files, conflicts };
}
