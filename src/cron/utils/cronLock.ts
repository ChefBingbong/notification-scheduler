export class CronLock {
  private jobQueue: Array<{ id: string; jobFunction: () => Promise<any> }> = [];
  private isJobRunning = false;

  public async addToQueue(jobId: string, jobFunction: () => Promise<any>) {
    if (!this.jobQueue.find((job) => job.id === jobId)) {
      this.jobQueue.push({ id: jobId, jobFunction });
    }
    this.runJobsSequentially();
  }

  private async runJobsSequentially() {
    if (!this.isJobRunning && this.jobQueue.length > 0) {
      this.isJobRunning = true;
      const { id, jobFunction } = this.jobQueue.shift()!;
      try {
        await jobFunction();
      } catch (error) {
        console.error(`Error in job ${id}: `, error);
      } finally {
        this.isJobRunning = false;
        this.runJobsSequentially();
      }
    }
  }
}

export const cronLock = new CronLock();
