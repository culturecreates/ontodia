export abstract class BatchingScheduler {
    private scheduled: number | undefined;

    constructor(readonly waitingTime = 0) {
        this.runSynchronously = this.runSynchronously.bind(this);
    }

    protected schedule() {
        if (typeof this.scheduled === 'undefined') {
            this.scheduled = setTimeout(this.runSynchronously, this.waitingTime);
        }
    }

    protected abstract run(): void;

    runSynchronously() {
        this.cancelScheduledTimeout();
        this.run();
    }

    dispose() {
        this.cancelScheduledTimeout();
    }

    private cancelScheduledTimeout() {
        if (typeof this.scheduled !== 'undefined') {
            clearTimeout(this.scheduled);
            this.scheduled = undefined;
        }
    }
}

export class DataFetchingThread extends BatchingScheduler {
    private fetchingPromise: Promise<string[]>;
    private fetchingQueue: string[] = [];

    private resolve: (queue: string[]) => void;
    private reject: (error: any) => void;

    constructor(waitingTime = 200) {
        super(waitingTime);
    }

    startFetchingThread(typeId: string): Promise<string[]> {
        this.fetchingQueue.push(typeId);
        if (this.fetchingPromise) {
            return Promise.resolve([]);
        } else {
            this.fetchingPromise = new Promise<string[]>((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
                this.schedule();
            });
            return this.fetchingPromise;
        }
    }

    run() {
        const {fetchingQueue, resolve} = this;
        this.fetchingPromise = undefined;
        this.fetchingQueue = [];
        this.resolve = undefined;
        this.reject = undefined;
        resolve(fetchingQueue);
    }

    dispose() {
        super.dispose();
        const {reject} = this;
        this.resolve = undefined;
        this.reject = undefined;
        if (reject) {
            reject(new Error('DataFetchingThread was disposed'));
        }
    }
}

export class Debouncer extends BatchingScheduler {
    private callback: (() => void) | undefined;

    call(callback: () => void) {
        this.callback = callback;
        this.schedule();
    }

    run() {
        this.callback();
    }
}
