export class MinHeap {
    constructor(compare = (a, b) => a - b) {
        this.compare = compare;
        this.heap = [];
    }

    size() {
        return this.heap.length;
    }

    push(value) {
        this.heap.push(value);
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this._sinkDown(0);
        }
        return top;
    }

    _bubbleUp(n) {
        const element = this.heap[n];
        while (n > 0) {
            const parentN = Math.floor((n - 1) / 2);
            const parent = this.heap[parentN];
            if (this.compare(element, parent) >= 0) break;
            this.heap[parentN] = element;
            this.heap[n] = parent;
            n = parentN;
        }
    }

    _sinkDown(n) {
        const length = this.heap.length;
        const element = this.heap[n];
        while (true) {
            let leftN = 2 * n + 1;
            let rightN = 2 * n + 2;
            let swap = null;

            if (leftN < length) {
                const left = this.heap[leftN];
                if (this.compare(left, element) < 0) swap = leftN;
            }
            if (rightN < length) {
                const right = this.heap[rightN];
                if ((swap === null && this.compare(right, element) < 0) ||
                    (swap !== null && this.compare(right, this.heap[swap]) < 0)) {
                    swap = rightN;
                }
            }
            if (swap === null) break;
            this.heap[n] = this.heap[swap];
            this.heap[swap] = element;
            n = swap;
        }
    }
}
