export function splitToNChunks<T>(array: Array<T>, n: number) {
    if (n <= 0) {
        throw new Error("n must be greater than 0");
    }

    let input = structuredClone(array);
    let result = [];
    for (let i = n; i > 0; i--) {
        result.push(input.splice(0, Math.ceil(input.length / i)));
    }
    return result;
}
